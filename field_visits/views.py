from datetime import datetime, date
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError

from accounts.models import User
from farms.models import Farm, Field
from alerts.models import Alert
from .models import (
    SupervisorFarmAssignment,
    RecurringFarmVisitSchedule,
    FarmVisit,
    FarmInspectionReport,
    ScheduleChangeHistory
)
from .serializers import (
    SupervisorFarmAssignmentSerializer,
    RecurringFarmVisitScheduleSerializer,
    FarmVisitSerializer,
    FarmInspectionReportSerializer,
    ScheduleChangeHistorySerializer
)
from .services import (
    validate_schedule_conflict,
    generate_scheduled_visits_for_window,
    mark_missed_visits,
    create_visit_notification
)


class SupervisorFarmAssignmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for SupervisorFarmAssignment.
    - Admins can create, update, activate/deactivate, and view all assignments.
    - Supervisors can view assignments assigned to them.
    - Farmers can view assignments for their own farms.
    """
    serializer_class = SupervisorFarmAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager'] or user.is_superuser:
            qs = SupervisorFarmAssignment.objects.all()
        elif user.role == 'supervisor':
            qs = SupervisorFarmAssignment.objects.filter(supervisor=user)
        elif user.role == 'farmer':
            qs = SupervisorFarmAssignment.objects.filter(farmer=user)
        else:
            qs = SupervisorFarmAssignment.objects.none()

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))

        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            qs = qs.filter(supervisor_id=supervisor_id)

        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm_id=farm_id)

        return qs.select_related('supervisor', 'farmer', 'farm', 'field', 'recurring_schedule')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'manager'] and not user.is_superuser:
            raise PermissionDenied("Only administrators can assign field supervisors to farms.")

        with transaction.atomic():
            assignment = serializer.save(assigned_by=user)

            # Create corresponding RecurringFarmVisitSchedule
            RecurringFarmVisitSchedule.objects.create(
                assignment=assignment,
                weekly_visit_day=assignment.weekly_visit_day,
                start_time=assignment.start_time,
                end_time=assignment.end_time,
                effective_from=assignment.start_date,
                effective_to=assignment.end_date,
                is_active=assignment.is_active
            )

            # Create audit history record
            ScheduleChangeHistory.objects.create(
                assignment=assignment,
                changed_by=user,
                change_type='CREATED',
                new_schedule_details={
                    'weekly_visit_day': assignment.weekly_visit_day,
                    'weekly_visit_day_display': assignment.weekly_visit_day_display,
                    'start_time': assignment.start_time.strftime('%H:%M:%S'),
                    'end_time': assignment.end_time.strftime('%H:%M:%S'),
                    'start_date': assignment.start_date.isoformat(),
                    'is_active': assignment.is_active
                },
                reason="Initial assignment created by administrator"
            )

            # Pre-generate 4 weeks of visits
            generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=4)

            # Send notifications
            day_name = assignment.weekly_visit_day_display
            create_visit_notification(
                user=assignment.farmer,
                visit=None,
                title="Field Supervisor Assigned",
                message=f"Supervisor {assignment.supervisor.full_name or assignment.supervisor.username} has been assigned to visit {assignment.farm.name} every {day_name} between {assignment.start_time.strftime('%I:%M %p')} and {assignment.end_time.strftime('%I:%M %p')}.",
                severity=Alert.Severity.LOW
            )
            create_visit_notification(
                user=assignment.supervisor,
                visit=None,
                title="New Farm Assignment",
                message=f"You have been assigned to farm '{assignment.farm.name}' (Farmer: {assignment.farmer.full_name or assignment.farmer.username}) for recurring visits every {day_name} from {assignment.start_time.strftime('%I:%M %p')} to {assignment.end_time.strftime('%I:%M %p')}.",
                severity=Alert.Severity.LOW
            )

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'manager'] and not user.is_superuser:
            raise PermissionDenied("Only administrators can update supervisor assignments.")

        instance = self.get_object()
        old_day = instance.weekly_visit_day
        old_start = instance.start_time
        old_end = instance.end_time
        old_active = instance.is_active

        with transaction.atomic():
            updated = serializer.save()

            # Sync recurring schedule
            rec_sched, _ = RecurringFarmVisitSchedule.objects.get_or_create(assignment=updated, defaults={
                'weekly_visit_day': updated.weekly_visit_day,
                'start_time': updated.start_time,
                'end_time': updated.end_time,
                'effective_from': updated.start_date,
                'effective_to': updated.end_date,
                'is_active': updated.is_active
            })
            rec_sched.weekly_visit_day = updated.weekly_visit_day
            rec_sched.start_time = updated.start_time
            rec_sched.end_time = updated.end_time
            rec_sched.effective_from = updated.start_date
            rec_sched.effective_to = updated.end_date
            rec_sched.is_active = updated.is_active
            rec_sched.save()

            # Schedule change log
            schedule_changed = (old_day != updated.weekly_visit_day or old_start != updated.start_time or old_end != updated.end_time)
            change_type = 'SCHEDULE_UPDATED' if schedule_changed else ('STATUS_CHANGED' if old_active != updated.is_active else 'UPDATED')

            ScheduleChangeHistory.objects.create(
                assignment=updated,
                changed_by=user,
                change_type=change_type,
                previous_schedule_details={
                    'weekly_visit_day': old_day,
                    'start_time': old_start.strftime('%H:%M:%S'),
                    'end_time': old_end.strftime('%H:%M:%S'),
                    'is_active': old_active
                },
                new_schedule_details={
                    'weekly_visit_day': updated.weekly_visit_day,
                    'weekly_visit_day_display': updated.weekly_visit_day_display,
                    'start_time': updated.start_time.strftime('%H:%M:%S'),
                    'end_time': updated.end_time.strftime('%H:%M:%S'),
                    'is_active': updated.is_active
                },
                reason=self.request.data.get('change_reason', 'Schedule modified by administrator')
            )

            # If schedule changed, remove future unperformed SCHEDULED visits and regenerate according to new schedule
            if schedule_changed and updated.is_active:
                today = timezone.localdate()
                FarmVisit.objects.filter(
                    assignment=updated,
                    status=FarmVisit.Status.SCHEDULED,
                    scheduled_date__gte=today
                ).delete()
                generate_scheduled_visits_for_window(assignment_id=updated.id, weeks_ahead=4)

                # Notify
                day_name = updated.weekly_visit_day_display
                create_visit_notification(
                    user=updated.farmer,
                    visit=None,
                    title="Farm Visit Schedule Changed",
                    message=f"The recurring visit schedule for {updated.farm.name} has been updated to every {day_name} from {updated.start_time.strftime('%I:%M %p')} to {updated.end_time.strftime('%I:%M %p')}.",
                    severity=Alert.Severity.MEDIUM
                )
                create_visit_notification(
                    user=updated.supervisor,
                    visit=None,
                    title="Visit Schedule Updated",
                    message=f"The recurring schedule for '{updated.farm.name}' was updated to every {day_name} ({updated.start_time.strftime('%I:%M %p')} - {updated.end_time.strftime('%I:%M %p')}).",
                    severity=Alert.Severity.LOW
                )

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """Admin toggles active/inactive without deleting past visit history."""
        user = request.user
        if user.role not in ['admin', 'manager'] and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        assignment = self.get_object()
        new_status = not assignment.is_active
        assignment.is_active = new_status
        assignment.save(update_fields=['is_active', 'updated_at'])

        if hasattr(assignment, 'recurring_schedule'):
            assignment.recurring_schedule.is_active = new_status
            assignment.recurring_schedule.save(update_fields=['is_active', 'updated_at'])

        ScheduleChangeHistory.objects.create(
            assignment=assignment,
            changed_by=user,
            change_type='REACTIVATED' if new_status else 'DEACTIVATED',
            previous_schedule_details={'is_active': not new_status},
            new_schedule_details={'is_active': new_status},
            reason=request.data.get('reason', 'Status toggled by administrator')
        )

        # If deactivated, cancel upcoming SCHEDULED visits
        if not new_status:
            today = timezone.localdate()
            FarmVisit.objects.filter(
                assignment=assignment,
                status=FarmVisit.Status.SCHEDULED,
                scheduled_date__gte=today
            ).update(
                status=FarmVisit.Status.CANCELLED,
                cancellation_reason="Assignment deactivated by administrator",
                cancelled_at=timezone.now()
            )
        else:
            # If reactivated, generate upcoming visits
            generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=4)

        return Response({
            'message': f"Assignment {'activated' if new_status else 'deactivated'} successfully.",
            'is_active': new_status
        })

    @action(detail=False, methods=['get'], url_path='options')
    def options_data(self, request):
        """Returns lists of supervisors, farmers, and farms for admin assignment forms."""
        supervisors = User.objects.filter(role='supervisor', is_active=True).values(
            'id', 'username', 'full_name', 'email', 'phone_number', 'district'
        )
        farmers = User.objects.filter(role='farmer', is_active=True).values(
            'id', 'username', 'full_name', 'email', 'phone_number', 'district'
        )
        farms = Farm.objects.filter(is_active=True).values(
            'id', 'name', 'user_id', 'location', 'district', 'total_area'
        )
        fields = Field.objects.filter(is_active=True).values(
            'id', 'name', 'farm_id', 'area', 'crop_stage'
        )
        return Response({
            'supervisors': list(supervisors),
            'farmers': list(farmers),
            'farms': list(farms),
            'fields': list(fields),
        })


class FarmVisitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FarmVisit records.
    - Supervisors view their assigned visits and execute visits (Start, Complete, Reschedule).
    - Farmers view their upcoming and historical visits + inspection reports.
    - Admins view and manage all visits.
    """
    serializer_class = FarmVisitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager'] or user.is_superuser:
            qs = FarmVisit.objects.all()
        elif user.role == 'supervisor':
            qs = FarmVisit.objects.filter(supervisor=user)
        elif user.role == 'farmer':
            qs = FarmVisit.objects.filter(farmer=user)
        else:
            qs = FarmVisit.objects.none()

        # Optional filters
        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm_id=farm_id)

        farmer_id = self.request.query_params.get('farmer')
        if farmer_id:
            qs = qs.filter(farmer_id=farmer_id)

        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            qs = qs.filter(supervisor_id=supervisor_id)

        visit_status = self.request.query_params.get('status')
        if visit_status:
            qs = qs.filter(status=visit_status.upper())

        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(scheduled_date=date_param)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(scheduled_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(scheduled_date__lte=date_to)

        return qs.select_related(
            'assignment', 'supervisor', 'farmer', 'farm', 'field'
        ).prefetch_related('inspection_report')

    @action(detail=True, methods=['post'], url_path='start')
    def start_visit(self, request, pk=None):
        """
        Supervisor starts the visit. Changes status to IN_PROGRESS
        and records actual_start_time.
        """
        visit = self.get_object()
        user = request.user

        if user.role != 'supervisor' and not user.is_superuser and user.role not in ['admin']:
            return Response({'error': 'Only the assigned supervisor can start this visit.'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'supervisor' and visit.supervisor != user:
            return Response({'error': 'You are not the assigned supervisor for this visit.'}, status=status.HTTP_403_FORBIDDEN)

        if visit.status == FarmVisit.Status.COMPLETED:
            return Response({'error': 'This visit is already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        if visit.status == FarmVisit.Status.CANCELLED:
            return Response({'error': 'Cannot start a cancelled visit.'}, status=status.HTTP_400_BAD_REQUEST)

        visit.actual_start_time = timezone.now()
        visit.status = FarmVisit.Status.IN_PROGRESS
        visit.save(update_fields=['actual_start_time', 'status', 'updated_at'])

        # Notify farmer that supervisor has arrived / started inspection
        create_visit_notification(
            user=visit.farmer,
            visit=visit,
            title="Supervisor Visit Started",
            message=f"Supervisor {visit.supervisor.full_name or visit.supervisor.username} has started the field inspection at {visit.farm.name}.",
            severity=Alert.Severity.LOW
        )

        return Response({
            'message': f"Visit #{visit.id} started successfully at {visit.actual_start_time.strftime('%I:%M %p')}.",
            'visit': FarmVisitSerializer(visit).data
        })

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_visit(self, request, pk=None):
        """
        Supervisor completes visit and submits the 13 inspection report items.
        Changes status to COMPLETED, saves actual_end_time and FarmInspectionReport.
        """
        visit = self.get_object()
        user = request.user

        if user.role != 'supervisor' and not user.is_superuser and user.role not in ['admin']:
            return Response({'error': 'Only the assigned supervisor can complete this visit.'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'supervisor' and visit.supervisor != user:
            return Response({'error': 'You are not the assigned supervisor for this visit.'}, status=status.HTTP_403_FORBIDDEN)

        if visit.status == FarmVisit.Status.COMPLETED and hasattr(visit, 'inspection_report'):
            return Response({'error': 'This visit has already been completed with an inspection report.'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data

        # Validate required inspection fields
        crop_condition = data.get('crop_condition')
        soil_obs = data.get('soil_and_field_observations')
        irrigation_status = data.get('irrigation_system_status')
        water_obs = data.get('water_availability_and_observations')
        actions = data.get('recommended_agricultural_actions')

        if not all([crop_condition, soil_obs, irrigation_status, water_obs, actions]):
            return Response({
                'error': 'Missing required inspection fields: crop_condition, soil_and_field_observations, irrigation_system_status, water_availability_and_observations, and recommended_agricultural_actions are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            now = timezone.now()
            if not visit.actual_start_time:
                visit.actual_start_time = now

            visit.actual_end_time = now
            visit.status = FarmVisit.Status.COMPLETED
            visit.save(update_fields=['actual_start_time', 'actual_end_time', 'status', 'updated_at'])

            # Update assignment last_actual_visit_date
            assignment = visit.assignment
            assignment.last_actual_visit_date = now.date()
            assignment.save(update_fields=['last_actual_visit_date', 'updated_at'])

            # Create or update FarmInspectionReport
            report, created = FarmInspectionReport.objects.update_or_create(
                visit=visit,
                defaults={
                    'supervisor': visit.supervisor,
                    'farmer': visit.farmer,
                    'farm': visit.farm,
                    'field': visit.field,
                    'crop_condition': crop_condition,
                    'crop_growth_stage': data.get('crop_growth_stage', ''),
                    'soil_and_field_observations': soil_obs,
                    'irrigation_system_status': irrigation_status,
                    'water_availability_and_observations': water_obs,
                    'pest_or_disease_symptoms': data.get('pest_or_disease_symptoms', 'None observed'),
                    'fertilizer_or_pesticide_observations': data.get('fertilizer_or_pesticide_observations', ''),
                    'recommended_agricultural_actions': actions,
                    'maintenance_issues': data.get('maintenance_issues', ''),
                    'follow_up_required': bool(data.get('follow_up_required', False)),
                    'follow_up_notes': data.get('follow_up_notes', ''),
                    'next_recommended_visit_date': data.get('next_recommended_visit_date') or None,
                    'additional_remarks': data.get('additional_remarks', ''),
                }
            )

            # Send Notification to Farmer with summary of recommendations
            create_visit_notification(
                user=visit.farmer,
                visit=visit,
                title="Farm Inspection Report Available",
                message=f"Supervisor {visit.supervisor.full_name or visit.supervisor.username} completed the inspection for {visit.farm.name}. Condition: {crop_condition}. Recommendation: {actions[:120]}...",
                severity=Alert.Severity.LOW
            )

        return Response({
            'message': f"Inspection completed successfully for Visit #{visit.id}.",
            'visit': FarmVisitSerializer(visit).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reschedule')
    def reschedule_visit(self, request, pk=None):
        """Reschedule visit to another date/time with a recorded reason."""
        visit = self.get_object()
        user = request.user

        if user.role != 'supervisor' and user.role not in ['admin', 'manager'] and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        new_date = request.data.get('new_date')
        new_start = request.data.get('new_start_time') or visit.scheduled_start_time
        new_end = request.data.get('new_end_time') or visit.scheduled_end_time
        reason = request.data.get('reason')

        if not new_date or not reason:
            return Response({'error': 'Both new_date and reason are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Preserve original date in history
        original_date = visit.scheduled_date
        visit.rescheduled_from_date = original_date
        visit.rescheduled_reason = reason
        visit.scheduled_date = new_date
        visit.scheduled_start_time = new_start
        visit.scheduled_end_time = new_end
        visit.status = FarmVisit.Status.RESCHEDULED
        visit.save()

        # Notify farmer
        create_visit_notification(
            user=visit.farmer,
            visit=visit,
            title="Farm Visit Rescheduled",
            message=f"Your farm visit for {visit.farm.name} originally scheduled for {original_date} has been rescheduled to {new_date} ({new_start} - {new_end}). Reason: {reason}",
            severity=Alert.Severity.MEDIUM
        )

        return Response({
            'message': f"Visit #{visit.id} rescheduled to {new_date}.",
            'visit': FarmVisitSerializer(visit).data
        })

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_visit(self, request, pk=None):
        """Cancel visit with mandatory cancellation reason."""
        visit = self.get_object()
        user = request.user

        if user.role != 'supervisor' and user.role not in ['admin', 'manager'] and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason')
        if not reason:
            return Response({'error': 'Cancellation reason is mandatory.'}, status=status.HTTP_400_BAD_REQUEST)

        visit.status = FarmVisit.Status.CANCELLED
        visit.cancellation_reason = reason
        visit.cancelled_at = timezone.now()
        visit.save(update_fields=['status', 'cancellation_reason', 'cancelled_at', 'updated_at'])

        # Notify farmer
        create_visit_notification(
            user=visit.farmer,
            visit=visit,
            title="Farm Visit Cancelled",
            message=f"The scheduled visit for {visit.farm.name} on {visit.scheduled_date} was cancelled. Reason: {reason}",
            severity=Alert.Severity.MEDIUM
        )

        return Response({
            'message': f"Visit #{visit.id} has been cancelled.",
            'visit': FarmVisitSerializer(visit).data
        })

    @action(detail=False, methods=['post'], url_path='generate-schedule')
    def generate_schedule(self, request):
        """Endpoint to generate 4-week rolling schedule on demand."""
        user = request.user
        if user.role not in ['admin', 'manager', 'supervisor'] and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        weeks = int(request.data.get('weeks', 4))
        count = generate_scheduled_visits_for_window(weeks_ahead=weeks)
        missed_count = mark_missed_visits()

        return Response({
            'message': f"Generated {count} scheduled visits for the next {weeks} weeks.",
            'generated_count': count,
            'missed_updated_count': missed_count
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Summary dashboard metrics scoped to user role."""
        user = request.user
        qs = self.get_queryset()
        today = timezone.localdate()

        assignments_qs = SupervisorFarmAssignment.objects.filter(is_active=True)
        if user.role == 'supervisor':
            assignments_qs = assignments_qs.filter(supervisor=user)
        elif user.role == 'farmer':
            assignments_qs = assignments_qs.filter(farmer=user)

        total_farms = assignments_qs.values('farm').distinct().count()
        today_visits = qs.filter(scheduled_date=today).count()
        upcoming = qs.filter(scheduled_date__gt=today, status=FarmVisit.Status.SCHEDULED).count()
        completed = qs.filter(status=FarmVisit.Status.COMPLETED).count()
        in_progress = qs.filter(status=FarmVisit.Status.IN_PROGRESS).count()
        rescheduled = qs.filter(status=FarmVisit.Status.RESCHEDULED).count()
        missed = qs.filter(status=FarmVisit.Status.MISSED).count()
        cancelled = qs.filter(status=FarmVisit.Status.CANCELLED).count()

        # Follow-up tasks count from inspection reports
        follow_ups = FarmInspectionReport.objects.filter(
            follow_up_required=True
        )
        if user.role == 'supervisor':
            follow_ups = follow_ups.filter(supervisor=user)
        elif user.role == 'farmer':
            follow_ups = follow_ups.filter(farmer=user)

        return Response({
            'total_assigned_farms': total_farms,
            'today_visits': today_visits,
            'upcoming_visits': upcoming,
            'completed_visits': completed,
            'in_progress_visits': in_progress,
            'rescheduled_visits': rescheduled,
            'missed_visits': missed,
            'cancelled_visits': cancelled,
            'follow_up_tasks': follow_ups.count()
        })


class FarmInspectionReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for Farmers and Supervisors to browse inspection reports.
    Farmers can only access reports for their own farms.
    """
    serializer_class = FarmInspectionReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager'] or user.is_superuser:
            qs = FarmInspectionReport.objects.all()
        elif user.role == 'supervisor':
            qs = FarmInspectionReport.objects.filter(supervisor=user)
        elif user.role == 'farmer':
            qs = FarmInspectionReport.objects.filter(farmer=user)
        else:
            qs = FarmInspectionReport.objects.none()

        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm_id=farm_id)

        return qs.select_related('visit', 'supervisor', 'farmer', 'farm', 'field')
