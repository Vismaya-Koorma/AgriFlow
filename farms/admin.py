from django.contrib import admin
from .models import (
    Farm, Field, FieldInspectionCriterion, FieldInspection,
    FieldCriterionResult, FieldCorrectiveAction, FieldVerificationHistory
)


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'district', 'state', 'total_area', 'is_active', 'created_at')
    list_filter = ('is_active', 'state', 'district')
    search_fields = ('name', 'user__username', 'location')
    ordering = ('-created_at',)


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display = ('name', 'farm', 'crop_type', 'soil_type', 'crop_stage', 'verification_status', 'verified_by', 'is_active')
    list_filter = ('verification_status', 'crop_stage', 'is_active', 'crop_type', 'soil_type')
    search_fields = ('name', 'farm__name', 'farm__user__username')
    ordering = ('-created_at',)


@admin.register(FieldInspectionCriterion)
class FieldInspectionCriterionAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'category', 'is_mandatory', 'is_critical', 'is_active')
    list_filter = ('category', 'is_mandatory', 'is_critical', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('order', 'id')


class FieldCriterionResultInline(admin.TabularInline):
    model = FieldCriterionResult
    extra = 0


@admin.register(FieldInspection)
class FieldInspectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'field', 'farm', 'supervisor', 'farmer', 'decision', 'inspection_date')
    list_filter = ('decision', 'is_reinspection')
    search_fields = ('field__name', 'farm__name', 'supervisor__username', 'farmer__username')
    inlines = [FieldCriterionResultInline]
    ordering = ('-inspection_date',)


@admin.register(FieldCorrectiveAction)
class FieldCorrectiveActionAdmin(admin.ModelAdmin):
    list_display = ('id', 'field', 'farmer', 'status', 'due_date', 'resolved_at', 'created_at')
    list_filter = ('status',)
    search_fields = ('field__name', 'farmer__username', 'action_description')
    ordering = ('-created_at',)


@admin.register(FieldVerificationHistory)
class FieldVerificationHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'field', 'previous_status', 'new_status', 'decision', 'action_by', 'created_at')
    list_filter = ('new_status', 'decision')
    search_fields = ('field__name', 'action_by__username')
    ordering = ('-created_at',)
