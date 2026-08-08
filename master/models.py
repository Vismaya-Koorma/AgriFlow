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
