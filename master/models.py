from django.db import models


class CropType(models.Model):
    """tbl_crop_type"""
    name = models.CharField(max_length=100, unique=True)
    crop_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    description = models.TextField(blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_crop_type'

    def __str__(self):
        return self.name


class SoilType(models.Model):
    """tbl_soil_type"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    water_retention = models.CharField(max_length=50, blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_soil_type'

    def __str__(self):
        return self.name


class CropVariety(models.Model):
    """tbl_crop_variety — Represents specific varieties of a crop (e.g. Arka Rakshak Tomato)."""

    crop = models.ForeignKey(CropType, on_delete=models.CASCADE, related_name='varieties')
    variety_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_crop_variety'
        unique_together = ['crop', 'variety_name']
        ordering = ['crop__name', 'variety_name']

    def __str__(self):
        return f"{self.crop.name} — {self.variety_name}"


class CropWaterRequirement(models.Model):
    """tbl_crop_water_requirement — Database-stored baseline water requirements for crop varieties, stages, and soil types."""

    STAGE_CHOICES = [
        ('germination', 'Germination'),
        ('vegetative', 'Vegetative'),
        ('flowering', 'Flowering'),
        ('fruiting', 'Fruiting'),
        ('harvesting', 'Harvesting'),
    ]

    crop = models.ForeignKey(CropType, on_delete=models.CASCADE, related_name='water_requirements')
    variety = models.ForeignKey(CropVariety, on_delete=models.CASCADE, null=True, blank=True, related_name='water_requirements')
    crop_stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='vegetative')
    soil_type = models.ForeignKey(SoilType, on_delete=models.CASCADE, null=True, blank=True, related_name='water_requirements')
    
    min_water = models.DecimalField(max_digits=8, decimal_places=2, help_text="Minimum water requirement (L/m²/day)")
    max_water = models.DecimalField(max_digits=8, decimal_places=2, help_text="Maximum water requirement (L/m²/day)")
    optimal_water = models.DecimalField(max_digits=8, decimal_places=2, help_text="Optimal baseline water requirement (L/m²/day)")
    unit = models.CharField(max_length=30, default='L/m²/day')

    source_reference = models.TextField(blank=True, help_text="Agricultural research source or reference (e.g. ICAR / FAO 56)")
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_crop_water_requirement'
        constraints = [
            models.UniqueConstraint(
                fields=['crop', 'variety', 'crop_stage', 'soil_type'],
                name='unique_crop_variety_stage_soil'
            )
        ]
        ordering = ['crop__name', 'variety__variety_name', 'crop_stage']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.min_water <= 0 or self.optimal_water <= 0 or self.max_water <= 0:
            raise ValidationError("Water values must be positive numbers greater than zero.")
        if not (self.min_water <= self.optimal_water <= self.max_water):
            raise ValidationError("Water requirement rule violated: min_water <= optimal_water <= max_water required.")
        if self.variety and self.variety.crop != self.crop:
            raise ValidationError(f"Variety '{self.variety.variety_name}' does not belong to selected crop '{self.crop.name}'.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        v_str = self.variety.variety_name if self.variety else 'All Varieties'
        s_str = self.soil_type.name if self.soil_type else 'All Soil Types'
        return f"{self.crop.name} ({v_str}) - {self.get_crop_stage_display()} - {s_str}: {self.optimal_water} {self.unit}"


class CropVarietyStageDuration(models.Model):
    """tbl_crop_variety_stage_duration — Variety-specific crop growth stage duration ranges in days after planting."""

    STAGE_CHOICES = [
        ('germination', 'Germination'),
        ('vegetative', 'Vegetative'),
        ('flowering', 'Flowering'),
        ('fruiting', 'Fruiting'),
        ('harvesting', 'Harvesting'),
    ]

    crop_variety = models.ForeignKey(
        CropVariety,
        on_delete=models.CASCADE,
        related_name='stage_durations'
    )
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    start_day = models.PositiveIntegerField(help_text="Start day after planting (inclusive, starting at 0)")
    end_day = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="End day after planting (inclusive). Leave blank/null for open-ended final harvesting stage."
    )

    source_reference = models.TextField(
        blank=True,
        help_text="Agricultural research reference for verified stage duration (e.g. KAU Package of Practices 2024 / ICAR)"
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_crop_variety_stage_duration'
        constraints = [
            models.UniqueConstraint(
                fields=['crop_variety', 'stage'],
                name='unique_crop_variety_stage'
            )
        ]
        ordering = ['crop_variety', 'start_day']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_day is not None and self.start_day > self.end_day:
            raise ValidationError("start_day must be less than or equal to end_day.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        end_str = f"{self.end_day}" if self.end_day is not None else "onwards"
        return f"{self.crop_variety.variety_name} — {self.get_stage_display()} (Days {self.start_day} to {end_str})"


