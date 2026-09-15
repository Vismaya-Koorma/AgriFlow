from django.contrib import admin
from .models import CropType, SoilType, CropVariety, CropWaterRequirement, CropVarietyStageDuration


@admin.register(CropType)
class CropTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'crop_value', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name',)


@admin.register(SoilType)
class SoilTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'water_retention', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name',)


@admin.register(CropVariety)
class CropVarietyAdmin(admin.ModelAdmin):
    list_display = ('id', 'crop', 'variety_name', 'status', 'created_at')
    list_filter = ('crop', 'status')
    search_fields = ('variety_name', 'crop__name', 'description')


@admin.register(CropWaterRequirement)
class CropWaterRequirementAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'crop', 'variety', 'crop_stage', 'soil_type',
        'min_water', 'optimal_water', 'max_water', 'unit', 'source_reference'
    )
    list_filter = ('crop', 'crop_stage', 'soil_type')
    search_fields = ('crop__name', 'variety__variety_name', 'source_reference', 'notes')
    ordering = ('crop', 'variety', 'crop_stage')


@admin.register(CropVarietyStageDuration)
class CropVarietyStageDurationAdmin(admin.ModelAdmin):
    list_display = ('id', 'crop_variety', 'stage', 'start_day', 'end_day', 'source_reference', 'updated_at')
    list_filter = ('crop_variety__crop', 'stage')
    search_fields = ('crop_variety__variety_name', 'crop_variety__crop__name', 'source_reference', 'notes')
    ordering = ('crop_variety', 'start_day')


