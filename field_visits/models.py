from django.db import models
from django.conf import settings
from farms.models import Farm, Field


WEEKDAY_CHOICES = [
    (0, 'Monday'),
    (1, 'Tuesday'),
    (2, 'Wednesday'),
    (3, 'Thursday'),
    (4, 'Friday'),
    (5, 'Saturday'),
    (6, 'Sunday'),
]


class SupervisorFarmAssignment(models.Model):
    """
    tbl_supervisor_farm_assignment — Links an existing field supervisor
    to an existing farm and farmer with fixed recurring schedule parameters.
    """
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='supervisor_assignments',
        limit_choices_to={'role': 'supervisor'}
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farmer_assignments',
        limit_choices_to={'role': 'farmer'}
    )
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name='supervisor_assignments'
    )
    field = models.ForeignKey(
        Field,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervisor_assignments'
    )
    weekly_visit_day = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        default=0,
        help_text="0=Monday, 1=Tuesday, ..., 6=Sunday"
    )
    start_time = models.TimeField(help_text="Scheduled slot start time, e.g. 09:00:00")
    end_time = models.TimeField(help_text="Scheduled slot end time, e.g. 12:00:00")
    start_date = models.DateField(help_text="Effective start date of this assignment")
    end_date = models.DateField(null=True, blank=True, help_text="Optional end date")
    is_active = models.BooleanField(default=True, help_text="Whether this assignment is actively scheduled")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_supervisor_assignments'
    )
    last_actual_visit_date = models.DateField(
        null=True,
        blank=True,
        help_text="Updated strictly from completed actual inspection records"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_supervisor_farm_assignment'
        ordering = ['-created_at']

    def __str__(self):
        day_name = dict(WEEKDAY_CHOICES).get(self.weekly_visit_day, 'Unknown')
        return f"{self.supervisor.full_name or self.supervisor.username} -> {self.farm.name} ({day_name} {self.start_time}-{self.end_time})"

    @property
    def weekly_visit_day_display(self):
        return dict(WEEKDAY_CHOICES).get(self.weekly_visit_day, 'Unknown')


class RecurringFarmVisitSchedule(models.Model):
    """
    tbl_recurring_farm_visit_schedule — Stores the weekly recurrence rule
    and effective dates for an assignment.
    """
    assignment = models.OneToOneField(
        SupervisorFarmAssignment,
        on_delete=models.CASCADE,
        related_name='recurring_schedule'
    )
    weekly_visit_day = models.IntegerField(choices=WEEKDAY_CHOICES, default=0)
    start_time = models.TimeField()
    end_time = models.TimeField()
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_recurring_farm_visit_schedule'
        ordering = ['-created_at']

    def __str__(self):
        return f"Schedule for Assignment #{self.assignment_id} ({self.get_weekly_visit_day_display()})"


class FarmVisit(models.Model):
    """
    tbl_farm_visit — Individual scheduled visit occurrence and actual visit timestamps.
    """
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        RESCHEDULED = 'RESCHEDULED', 'Rescheduled'
        MISSED = 'MISSED', 'Missed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    assignment = models.ForeignKey(
        SupervisorFarmAssignment,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conducted_visits'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_visits'
    )
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    field = models.ForeignKey(
        Field,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visits'
    )
    scheduled_date = models.DateField(help_text="Date of planned visit")
    scheduled_start_time = models.TimeField(help_text="Scheduled start time")
    scheduled_end_time = models.TimeField(help_text="Scheduled end time")
    actual_start_time = models.DateTimeField(null=True, blank=True, help_text="Set when supervisor starts visit")
    actual_end_time = models.DateTimeField(null=True, blank=True, help_text="Set when inspection is submitted")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    
    # Reschedule & Cancellation tracking
    rescheduled_from_date = models.DateField(null=True, blank=True)
    rescheduled_reason = models.TextField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Idempotent deduplication key
    unique_occurrence_key = models.CharField(
        max_length=150,
        unique=True,
        db_index=True,
        help_text="Compound key ensuring repeatable generator runs never duplicate visits"
    )
    is_supervisor_recorded = models.BooleanField(
        default=True,
        help_text="Marked supervisor-recorded when physical IoT/GPS hardware is not attached"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_farm_visit'
        ordering = ['scheduled_date', 'scheduled_start_time']
        indexes = [
            models.Index(fields=['supervisor', 'scheduled_date']),
            models.Index(fields=['farmer', 'scheduled_date']),
            models.Index(fields=['farm', 'status']),
        ]

    def __str__(self):
        return f"Visit #{self.id} — {self.farm.name} on {self.scheduled_date} [{self.get_status_display()}]"


class FarmInspectionReport(models.Model):
    """
    tbl_farm_inspection_report — Full inspection report submitted by supervisor
    upon visit completion. Contains all 13 required observation aspects.
    """
    visit = models.OneToOneField(
        FarmVisit,
        on_delete=models.CASCADE,
        related_name='inspection_report'
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_inspections'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farm_inspections'
    )
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name='inspections'
    )
    field = models.ForeignKey(
        Field,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inspections'
    )

    # 1. Crop condition
    crop_condition = models.CharField(
        max_length=50,
        help_text="e.g. Excellent, Good, Fair, Poor, Stressed"
    )
    # 2. Crop growth stage
    crop_growth_stage = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g. Germination, Vegetative, Flowering, Fruiting, Harvesting"
    )
    # 3. Soil and field observations
    soil_and_field_observations = models.TextField(
        help_text="Soil moisture, texture, soil erosion or compaction observations"
    )
    # 4. Irrigation system status
    irrigation_system_status = models.CharField(
        max_length=100,
        help_text="e.g. Functional, Partially Functional, Needs Maintenance, Inoperative"
    )
    # 5. Water availability and irrigation observations
    water_availability_and_observations = models.TextField(
        help_text="Canal flow, well/borewell level, water distribution uniformity"
    )
    # 6. Pest or disease symptoms
    pest_or_disease_symptoms = models.TextField(
        blank=True,
        default="None observed",
        help_text="Identified symptoms, infected plant parts, affected area"
    )
    # 7. Fertilizer or pesticide observations
    fertilizer_or_pesticide_observations = models.TextField(
        blank=True,
        null=True,
        help_text="Applied fertilizers/pesticides, visible deficiency signs"
    )
    # 8. Recommended agricultural actions
    recommended_agricultural_actions = models.TextField(
        help_text="Actionable recommendations for farmer (irrigation adjustments, treatments)"
    )
    # 9. Maintenance issues
    maintenance_issues = models.TextField(
        blank=True,
        null=True,
        help_text="Issues requiring technician/maintenance dispatch (leaks, pump damage, silt)"
    )
    # 10. Follow-up required
    follow_up_required = models.BooleanField(
        default=False,
        help_text="Whether this farm requires an expedited or special follow-up"
    )
    # 11. Follow-up notes
    follow_up_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Specific items to review during follow-up"
    )
    # 12. Next recommended visit date
    next_recommended_visit_date = models.DateField(
        null=True,
        blank=True,
        help_text="Suggested next visit date from supervisor"
    )
    # 13. Additional remarks
    additional_remarks = models.TextField(
        blank=True,
        null=True,
        help_text="Any other notes from the field visit"
    )

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_farm_inspection_report'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Inspection for Visit #{self.visit_id} ({self.crop_condition}) @ {self.submitted_at.date()}"


class ScheduleChangeHistory(models.Model):
    """
    tbl_schedule_change_history — Audit log tracking all authorized schedule
    modifications, deactivations, and reassignments without losing historical data.
    """
    assignment = models.ForeignKey(
        SupervisorFarmAssignment,
        on_delete=models.CASCADE,
        related_name='schedule_history'
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schedule_changes_made'
    )
    change_type = models.CharField(
        max_length=50,
        help_text="e.g. CREATED, SCHEDULE_UPDATED, DEACTIVATED, REACTIVATED, REASSIGNED"
    )
    previous_schedule_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Snapshot of previous weekday, time slot, and status"
    )
    new_schedule_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Snapshot of new weekday, time slot, and status"
    )
    reason = models.TextField(blank=True, null=True, help_text="Reason for schedule modification")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_schedule_change_history'
        ordering = ['-timestamp']

    def __str__(self):
        return f"Change [{self.change_type}] for Assignment #{self.assignment_id} @ {self.timestamp}"
