from django.db import models
from django.conf import settings
from master.models import CropType, SoilType, CropVariety


class Farm(models.Model):
    """tbl_farm — One user can own many farms."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farms'
    )
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, default='Kerala')
    total_area = models.DecimalField(max_digits=10, decimal_places=2, help_text='Area in acres')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_farm'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Field(models.Model):
    """tbl_field — One farm can have many fields."""

    class CropStage(models.TextChoices):
        GERMINATION = 'germination', 'Germination'
        VEGETATIVE = 'vegetative', 'Vegetative'
        FLOWERING = 'flowering', 'Flowering'
        FRUITING = 'fruiting', 'Fruiting'
        HARVESTING = 'harvesting', 'Harvesting'

    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        NEEDS_IMPROVEMENT = 'needs_improvement', 'Needs Improvement'
        REJECTED = 'rejected', 'Rejected'

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='fields')
    crop_type = models.ForeignKey(CropType, on_delete=models.SET_NULL, null=True, related_name='fields')
    crop_variety = models.ForeignKey(CropVariety, on_delete=models.SET_NULL, null=True, blank=True, related_name='fields')
    soil_type = models.ForeignKey(SoilType, on_delete=models.SET_NULL, null=True, related_name='fields')

    name = models.CharField(max_length=255)
    area = models.DecimalField(max_digits=10, decimal_places=2, help_text='Area in acres')
    planting_date = models.DateField(blank=True, null=True)
    crop_stage = models.CharField(max_length=20, choices=CropStage.choices, default=CropStage.GERMINATION)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, default='Kerala', blank=True, null=True)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_fields'
    )
    reinspection_scheduled_date = models.DateField(blank=True, null=True)
    status = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_field'
        ordering = ['-created_at']

    @property
    def effective_district(self):
        if self.district:
            return self.district
        if self.farm:
            return self.farm.location or self.farm.district
        return None

    @property
    def effective_state(self):
        if self.state:
            return self.state
        if self.farm:
            return self.farm.state or 'Kerala'
        return 'Kerala'

    def __str__(self):
        return f"{self.name} @ {self.farm.name}"


class FieldInspectionCriterion(models.Model):
    """
    tbl_field_inspection_criterion — Configurable criteria for ground truth field inspection.
    Configured by Administrators across 7 functional categories.
    """
    class Category(models.TextChoices):
        CROP_HEALTH = 'crop_health', 'Crop health and growth'
        IRRIGATION_WATER = 'irrigation_water', 'Irrigation and water availability'
        SOIL_DRAINAGE = 'soil_drainage', 'Soil condition and drainage'
        PEST_DISEASE = 'pest_disease', 'Pest and disease inspection'
        FERTILIZER_PRACTICES = 'fertilizer_practices', 'Fertilizer and farming practices'
        FIELD_MAINTENANCE = 'field_maintenance', 'Field maintenance'
        CORRECTIVE_ACTIONS = 'corrective_actions', 'Previous corrective actions'

    category = models.CharField(max_length=50, choices=Category.choices)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_mandatory = models.BooleanField(default=True, help_text="Must be evaluated if applicable")
    is_critical = models.BooleanField(default=False, help_text="If this criterion fails, field is REJECTED")
    acceptance_guideline = models.TextField(blank=True, null=True, help_text="Guideline or threshold for passing")
    threshold_unit = models.CharField(max_length=50, blank=True, null=True, help_text="Optional measurement unit (%, pH, cm, etc.)")
    min_threshold = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    max_threshold = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Scoping applicability
    applicable_crop_types = models.ManyToManyField(
        CropType, blank=True, related_name='inspection_criteria',
        help_text="Leave blank to apply to all crop types"
    )
    applicable_stages = models.JSONField(
        default=list, blank=True,
        help_text="List of crop stages this applies to. Empty list means all stages."
    )
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_field_inspection_criterion'
        ordering = ['order', 'id']

    def __str__(self):
        crit_tag = "[CRITICAL] " if self.is_critical else ""
        return f"{crit_tag}{self.get_category_display()} - {self.name}"


class FieldInspection(models.Model):
    """
    tbl_field_inspection — Full inspection instance conducted on a field.
    Tracks supervisor findings, automatic calculated decision, and history.
    """
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='ground_truth_inspections')
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='field_inspections')
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='conducted_field_inspections'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farmer_field_inspections'
    )
    decision = models.CharField(
        max_length=30, choices=Field.VerificationStatus.choices,
        help_text="Calculated decision: VERIFIED, NEEDS_IMPROVEMENT, or REJECTED"
    )
    overall_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    reinspection_scheduled_date = models.DateField(blank=True, null=True)
    is_reinspection = models.BooleanField(default=False)
    previous_inspection = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reinspections'
    )
    inspection_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_field_inspection'
        ordering = ['-inspection_date']

    def __str__(self):
        return f"Inspection #{self.id} for {self.field.name} [{self.decision.upper()}] @ {self.inspection_date.strftime('%Y-%m-%d')}"


class FieldCriterionResult(models.Model):
    """
    tbl_field_criterion_result — Assessment outcome for an individual criterion during an inspection.
    """
    class Result(models.TextChoices):
        PASS = 'pass', 'Pass'
        FAIL = 'fail', 'Fail'
        NOT_APPLICABLE = 'not_applicable', 'Not Applicable'

    inspection = models.ForeignKey(FieldInspection, on_delete=models.CASCADE, related_name='criterion_results')
    criterion = models.ForeignKey(FieldInspectionCriterion, on_delete=models.PROTECT, related_name='results')
    result = models.CharField(max_length=20, choices=Result.choices)
    observation = models.TextField(
        blank=True, null=True,
        help_text="Mandatory explanation if NOT_APPLICABLE; general observation otherwise"
    )
    measured_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    measured_unit = models.CharField(max_length=50, blank=True, null=True)
    failure_reason = models.TextField(blank=True, null=True, help_text="Required when result is FAIL")
    corrective_action = models.TextField(blank=True, null=True, help_text="Required when result is FAIL")

    class Meta:
        db_table = 'tbl_field_criterion_result'
        unique_together = ('inspection', 'criterion')

    def __str__(self):
        return f"{self.criterion.name}: {self.result.upper()} (Inspection #{self.inspection_id})"


class FieldCorrectiveAction(models.Model):
    """
    tbl_field_corrective_action — Recommended corrective action generated from failed criteria.
    Visible to the farmer and trackable until reinspection/resolution.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'

    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='corrective_actions')
    inspection = models.ForeignKey(FieldInspection, on_delete=models.CASCADE, related_name='corrective_actions')
    criterion_result = models.ForeignKey(
        FieldCriterionResult, on_delete=models.SET_NULL, null=True, blank=True, related_name='corrective_actions'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='field_corrective_actions'
    )
    action_description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    resolution_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_field_corrective_action'
        ordering = ['-created_at']

    def __str__(self):
        return f"Action #{self.id} for {self.field.name} [{self.status.upper()}]"


class FieldVerificationHistory(models.Model):
    """
    tbl_field_verification_history — Permanent audit log of all verification decisions and status changes.
    Never deleted or overwritten.
    """
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='verification_history')
    inspection = models.ForeignKey(
        FieldInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='history_logs'
    )
    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='field_verification_actions'
    )
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    decision = models.CharField(max_length=30)
    reason = models.TextField(blank=True, null=True)
    failed_criteria_summary = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_field_verification_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"History: {self.field.name} -> {self.new_status} by {self.action_by} @ {self.created_at}"
