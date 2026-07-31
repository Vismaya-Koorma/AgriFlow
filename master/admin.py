from django.contrib import admin
from .models import CropType, SoilType


@admin.register(CropType)
class CropTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(SoilType)
class SoilTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'water_retention', 'created_at')
    search_fields = ('name',)
