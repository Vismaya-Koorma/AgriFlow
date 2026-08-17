from django.db import models


class IrrigationHistory(models.Model):
    """tbl_irrigation_history — Many irrigation records per field."""

    class Method(models.TextChoices):
        DRIP = 'drip', 'Drip'
        SPRINKLER = 'sprinkler', 'Sprinkler'
        FLOOD = 'flood', 'Flood'
        MANUAL = 'manual', 'Manual'
        SURFACE = 'surface', 'Surface'

    class Source(models.TextChoices):
        CANAL = 'canal', 'Canal'
        BOREWELL = 'borewell', 'Borewell'
        RAIN = 'rain', 'Rainwater'
        RIVER = 'river', 'River'
        TANK = 'tank', 'Tank'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='irrigation_history')
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.DRIP)
    water_source = models.CharField(max_length=20, choices=Source.choices, default=Source.CANAL)
    volume_litres = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    field_condition = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='irrigation_records')
    irrigated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_irrigation_history'
        ordering = ['-irrigated_at']

    def __str__(self):
        return f"{self.field.name} — {self.volume_litres}L on {self.irrigated_at.date()}"


class RainfallConfirmation(models.Model):
    """tbl_rainfall_confirmation"""

    class RainfallOption(models.TextChoices):
        NO_RAIN = 'no_rain', 'No Rain'
        LIGHT_RAIN = 'light_rain', 'Light Rain'
        MODERATE_RAIN = 'moderate_rain', 'Moderate Rain'
        HEAVY_RAIN = 'heavy_rain', 'Heavy Rain'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='rainfall_confirmations')
    rainfall_option = models.CharField(
        max_length=20, choices=RainfallOption.choices, default=RainfallOption.NO_RAIN
    )
    rainfall_mm = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    confirmed_at = models.DateTimeField(auto_now_add=True)
    confirmed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='rainfall_confirmations'
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_rainfall_confirmation'
        ordering = ['-confirmed_at']

    def __str__(self):
        return f"{self.field.name} — {self.get_rainfall_option_display()} on {self.confirmed_at.date()}"


# ─── WATER RESOURCE MANAGER MODELS ──────────────────────────────────────────

class WaterSource(models.Model):
    """tbl_water_source — Regional water sources (Reservoir, Well, Canal, etc.)"""

    class SourceType(models.TextChoices):
        RESERVOIR = 'reservoir', 'Reservoir'
        POND = 'pond', 'Pond'
        WELL = 'well', 'Well'
        CANAL = 'canal', 'Canal'
        RIVER = 'river', 'River'
        RAINWATER = 'rainwater', 'Rainwater Storage'

    class Status(models.TextChoices):
        NORMAL = 'normal', 'Normal'
        LOW = 'low', 'Low'
        CRITICAL = 'critical', 'Critical'

    name = models.CharField(max_length=100)
    source_type = models.CharField(max_length=30, choices=SourceType.choices, default=SourceType.RESERVOIR)
    location = models.CharField(max_length=100, help_text="District or Location (e.g. Pala, Kottayam)")
    capacity_liters = models.DecimalField(max_digits=14, decimal_places=2, help_text="Total storage capacity in liters")
    current_level_liters = models.DecimalField(max_digits=14, decimal_places=2, help_text="Current stored water in liters")
    reserved_liters = models.DecimalField(max_digits=14, decimal_places=2, default=0, help_text="Water reserved for allocations")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NORMAL)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_water_source'
        ordering = ['-created_at']

    @property
    def available_liters(self):
        """Available water = Current level - Reserved allocations."""
        avail = float(self.current_level_liters) - float(self.reserved_liters)
        return max(0.0, avail)

    @property
    def percentage_level(self):
        if not self.capacity_liters or float(self.capacity_liters) == 0:
            return 0.0
        return round((float(self.current_level_liters) / float(self.capacity_liters)) * 100, 2)

    def calculate_status(self):
        """Auto-calculate status based on available percentage."""
        if not self.capacity_liters or float(self.capacity_liters) == 0:
            return self.Status.CRITICAL
        avail_pct = (self.available_liters / float(self.capacity_liters)) * 100
        if avail_pct > 40:
            return self.Status.NORMAL
        elif avail_pct >= 20:
            return self.Status.LOW
        else:
            return self.Status.CRITICAL

    def save(self, *args, **kwargs):
        self.status = self.calculate_status()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.location}) — {self.current_level_liters}L / {self.capacity_liters}L [{self.get_status_display()}]"


class WaterLevelHistory(models.Model):
    """tbl_water_level_history — Audit log of water level updates per source."""

    water_source = models.ForeignKey(WaterSource, on_delete=models.CASCADE, related_name='level_history')
    previous_level_liters = models.DecimalField(max_digits=14, decimal_places=2)
    new_level_liters = models.DecimalField(max_digits=14, decimal_places=2)
    change_amount_liters = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.TextField(blank=True, null=True)
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_water_level_history'
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.water_source.name}: {self.previous_level_liters}L -> {self.new_level_liters}L on {self.recorded_at.date()}"


class WaterAllocationRequest(models.Model):
    """tbl_water_allocation_request — Requests for water allocation to farms/fields."""

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class RequestStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        PARTIALLY_APPROVED = 'partially_approved', 'Partially Approved'
        REJECTED = 'rejected', 'Rejected'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    farmer = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='water_requests')
    farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='water_requests')
    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='water_requests')
    requested_amount_liters = models.DecimalField(max_digits=12, decimal_places=2)
    approved_amount_liters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=25, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    reason = models.TextField(blank=True, null=True, help_text="Reason for rejection or approval notes")
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_water_requests')
    recommendation = models.ForeignKey('recommendation.IrrigationRecommendation', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'tbl_water_allocation_request'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Req #{self.id}: {self.field.name} — {self.requested_amount_liters}L [{self.get_status_display()}]"


class WaterAllocation(models.Model):
    """tbl_water_allocation — Approved allocations assigned from a WaterSource."""

    class AllocationStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        USED = 'used', 'Used'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    request = models.ForeignKey(WaterAllocationRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='allocations')
    water_source = models.ForeignKey(WaterSource, on_delete=models.CASCADE, related_name='allocations')
    farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='water_allocations')
    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='water_allocations')
    allocated_amount_liters = models.DecimalField(max_digits=12, decimal_places=2)
    used_amount_liters = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=AllocationStatus.choices, default=AllocationStatus.ACTIVE)
    allocated_at = models.DateTimeField(auto_now_add=True)
    allocated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='made_allocations')

    class Meta:
        db_table = 'tbl_water_allocation'
        ordering = ['-allocated_at']

    @property
    def remaining_amount_liters(self):
        return max(0.0, float(self.allocated_amount_liters) - float(self.used_amount_liters))

    def __str__(self):
        return f"Alloc #{self.id}: {self.field.name} <- {self.water_source.name} ({self.allocated_amount_liters}L)"


class WaterUsage(models.Model):
    """tbl_water_usage — Actual recorded water consumption log against an allocation and source."""

    allocation = models.ForeignKey(WaterAllocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='usages')
    water_source = models.ForeignKey(WaterSource, on_delete=models.CASCADE, related_name='usages')
    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='water_usages')
    volume_liters = models.DecimalField(max_digits=12, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_water_usage'
        ordering = ['-used_at']

    def __str__(self):
        return f"Usage #{self.id}: {self.volume_liters}L used on {self.field.name} from {self.water_source.name}"

