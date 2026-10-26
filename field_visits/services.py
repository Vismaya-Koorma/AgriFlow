import logging
from datetime import timedelta, datetime, time
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction
from alerts.models import Alert
from .models import (
    SupervisorFarmAssignment,
    RecurringFarmVisitSchedule,
    FarmVisit,
    ScheduleChangeHistory,
    WEEKDAY_CHOICES
)

logger = logging.getLogger(__name__)


def validate_schedule_conflict(supervisor, weekly_visit_day, start_time, end_time, exclude_assignment_id=None):
    """
    Validates that a supervisor does NOT have an overlapping visit slot
    on the same weekday across different farm assignments.
    Raises ValidationError if an overlap is detected.
    """
    if start_time >= end_time:
        raise ValidationError({'time_slot': "Start time must be strictly earlier than end time."})

    qs = SupervisorFarmAssignment.objects.filter(
        supervisor=supervisor,
        weekly_visit_day=weekly_visit_day,
        is_active=True
    )
    if exclude_assignment_id:
        qs = qs.exclude(id=exclude_assignment_id)

    conflicting_assignments = []
    for existing in qs:
        # Check time overlap: (StartA < EndB) and (EndA > StartB)
        if start_time < existing.end_time and end_time > existing.start_time:
            conflicting_assignments.append(existing)

    if conflicting_assignments:
        conflict = conflicting_assignments[0]
        day_name = dict(WEEKDAY_CHOICES).get(weekly_visit_day, 'Unknown')
        raise ValidationError({
            'schedule_conflict': (
                f"Schedule conflict detected for Supervisor {supervisor.full_name or supervisor.username}: "
                f"Already assigned to '{conflict.farm.name}' on {day_name} from "
                f"{conflict.start_time.strftime('%I:%M %p')} to {conflict.end_time.strftime('%I:%M %p')}."
            )
        })
    return True


def generate_scheduled_visits_for_window(assignment_id=None, weeks_ahead=4, reference_date=None):
    """
    Generates persistent FarmVisit records for a rolling future window (default 4 weeks).
    Safe to run repeatedly; uses unique_occurrence_key to prevent duplicate generation.
    """
    if reference_date is None:
        reference_date = timezone.localdate()
    elif isinstance(reference_date, datetime):
        reference_date = reference_date.date()

    end_window_date = reference_date + timedelta(weeks=weeks_ahead)

    qs = SupervisorFarmAssignment.objects.filter(is_active=True).select_related(
        'supervisor', 'farmer', 'farm', 'field'
    )
    if assignment_id:
        qs = qs.filter(id=assignment_id)

    created_count = 0
    now = timezone.now()

    for assignment in qs:
        # Determine visit dates matching weekly_visit_day
        # In Python weekday: Monday is 0, Sunday is 6
        target_day = assignment.weekly_visit_day
        curr_date = reference_date

        while curr_date <= end_window_date:
            if curr_date.weekday() == target_day:
                # Check within assignment bounds
                if curr_date >= assignment.start_date:
                    if not assignment.end_date or curr_date <= assignment.end_date:
                        occurrence_key = f"{assignment.id}_{curr_date.isoformat()}"
                        
                        # Idempotent check
                        if not FarmVisit.objects.filter(unique_occurrence_key=occurrence_key).exists():
                            FarmVisit.objects.create(
                                assignment=assignment,
                                supervisor=assignment.supervisor,
                                farmer=assignment.farmer,
                                farm=assignment.farm,
                                field=assignment.field,
                                scheduled_date=curr_date,
                                scheduled_start_time=assignment.start_time,
                                scheduled_end_time=assignment.end_time,
                                status=FarmVisit.Status.SCHEDULED,
                                unique_occurrence_key=occurrence_key,
                                is_supervisor_recorded=True
                            )
                            created_count += 1
            curr_date += timedelta(days=1)

    logger.info(f"Generated {created_count} farm visits for window up to {end_window_date}.")
    return created_count


def mark_missed_visits():
    """
    Marks past SCHEDULED visits whose scheduled date has passed as MISSED.
    Does not mark future visits or already completed/cancelled visits.
    """
    today = timezone.localdate()

    # Past dates (prior to today) are marked MISSED
    past_visits = FarmVisit.objects.filter(
        status=FarmVisit.Status.SCHEDULED,
        scheduled_date__lt=today
    )

    missed_count = 0
    for visit in past_visits:
        visit.status = FarmVisit.Status.MISSED
        visit.save(update_fields=['status', 'updated_at'])
        missed_count += 1

        # Notify farmer & supervisor
        create_visit_notification(
            user=visit.farmer,
            visit=visit,
            title="Farm Visit Missed",
            message=f"The scheduled visit on {visit.scheduled_date} by {visit.supervisor.full_name or visit.supervisor.username} for {visit.farm.name} was not conducted.",
            severity=Alert.Severity.MEDIUM
        )
        create_visit_notification(
            user=visit.supervisor,
            visit=visit,
            title="Scheduled Visit Missed",
            message=f"Your scheduled visit for {visit.farm.name} on {visit.scheduled_date} ({visit.scheduled_start_time.strftime('%I:%M %p')}) was recorded as missed.",
            severity=Alert.Severity.MEDIUM
        )

    return missed_count


def create_visit_notification(user, visit, title, message, severity=Alert.Severity.LOW):
    """
    Creates an alert notification scoped to the recipient user.
    Guarantees no duplicate alert with the exact same title, user, and visit context.
    """
    if not user:
        return None

    # De-duplicate: do not recreate if same title and message for user already created in last 24h
    existing = Alert.objects.filter(
        user=user,
        title=title,
        message=message,
        farm=visit.farm if visit else None,
        is_resolved=False
    ).exists()

    if existing:
        return None

    try:
        alert = Alert.objects.create(
            user=user,
            farm=visit.farm if visit else None,
            field=visit.field if visit else None,
            alert_type=Alert.AlertType.SYSTEM,
            severity=severity,
            title=title,
            message=message,
            is_read=False,
            is_resolved=False
        )
        return alert
    except Exception as e:
        logger.error(f"Failed to create alert notification: {e}")
        return None


def auto_assign_supervisor_if_needed(supervisor, max_farms=10):
    """
    Ensures the supervisor is assigned to registered active farms.
    If the supervisor is missing assignments for registered farms,
    automatically links them and generates the 4-week rolling schedule.
    """
    if not supervisor or getattr(supervisor, 'role', '') != 'supervisor':
        return 0

    from farms.models import Farm, Field
    from accounts.models import User

    # Find active farms that have registered fields first, then any active farms
    farms_with_fields = list(
        Farm.objects.filter(fields__isnull=False, is_active=True).distinct().order_by('id')
    )
    if not farms_with_fields:
        farms_with_fields = list(Farm.objects.filter(fields__isnull=False).distinct().order_by('id'))
    if not farms_with_fields:
        farms_with_fields = list(Farm.objects.filter(is_active=True).order_by('id'))
    if not farms_with_fields:
        farms_with_fields = list(Farm.objects.all().order_by('id'))

    existing_assigned_farm_ids = set(
        SupervisorFarmAssignment.objects.filter(
            supervisor=supervisor,
            is_active=True
        ).values_list('farm_id', flat=True)
    )

    days = [0, 1, 2, 3, 4]  # Mon, Tue, Wed, Thu, Fri
    time_slots = [
        (time(9, 30), time(11, 30)),
        (time(14, 0), time(16, 0)),
    ]

    created = 0
    today = timezone.localdate()

    for idx, farm in enumerate(farms_with_fields[:max_farms]):
        if farm.id in existing_assigned_farm_ids:
            continue

        day = days[idx % len(days)]
        slot = time_slots[(idx // len(days)) % len(time_slots)]
        associated_field = farm.fields.first()
        farmer_user = farm.user
        if not farmer_user or getattr(farmer_user, 'role', '') != 'farmer':
            fallback = User.objects.filter(role='farmer', is_active=True).first()
            if fallback:
                farmer_user = fallback

        asgn = SupervisorFarmAssignment.objects.create(
            supervisor=supervisor,
            farmer=farmer_user,
            farm=farm,
            field=associated_field,
            weekly_visit_day=day,
            start_time=slot[0],
            end_time=slot[1],
            start_date=today,
            is_active=True
        )
        RecurringFarmVisitSchedule.objects.get_or_create(
            assignment=asgn,
            defaults={
                'weekly_visit_day': day,
                'start_time': asgn.start_time,
                'end_time': asgn.end_time,
                'effective_from': asgn.start_date,
                'is_active': True
            }
        )
        existing_assigned_farm_ids.add(farm.id)
        created += 1

    if created > 0:
        generate_scheduled_visits_for_window(weeks_ahead=4)

    return created
