from django.contrib import admin
from .models import Farm, Field


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'district', 'state', 'total_area', 'is_active', 'created_at')
    list_filter = ('is_active', 'state', 'district')
    search_fields = ('name', 'user__username', 'location')
    ordering = ('-created_at',)


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display = ('name', 'farm', 'crop_type', 'soil_type', 'crop_stage', 'area', 'is_active')
    list_filter = ('crop_stage', 'is_active', 'crop_type', 'soil_type')
    search_fields = ('name', 'farm__name', 'farm__user__username')
    ordering = ('-created_at',)
