from django.db import models
from django.conf import settings
from master.models import CropType, SoilType


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

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='fields')
    crop_type = models.ForeignKey(CropType, on_delete=models.SET_NULL, null=True, related_name='fields')
    soil_type = models.ForeignKey(SoilType, on_delete=models.SET_NULL, null=True, related_name='fields')
    name = models.CharField(max_length=255)
    area = models.DecimalField(max_digits=10, decimal_places=2, help_text='Area in acres')
    planting_date = models.DateField(blank=True, null=True)
    crop_stage = models.CharField(max_length=20, choices=CropStage.choices, default=CropStage.GERMINATION)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, default='Kerala', blank=True, null=True)
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
