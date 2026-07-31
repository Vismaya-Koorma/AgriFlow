from django.contrib import admin
from .models import IrrigationHistory, RainfallConfirmation


@admin.register(IrrigationHistory)
class IrrigationHistoryAdmin(admin.ModelAdmin):
    list_display = ('field', 'method', 'water_source', 'volume_litres', 'duration_minutes', 'irrigated_at')
    list_filter = ('method', 'water_source')
    search_fields = ('field__name', 'field__farm__name')
    ordering = ('-irrigated_at',)


@admin.register(RainfallConfirmation)
class RainfallConfirmationAdmin(admin.ModelAdmin):
    list_display = ('field', 'rainfall_mm', 'confirmed_at', 'confirmed_by')
    search_fields = ('field__name',)
    ordering = ('-confirmed_at',)
