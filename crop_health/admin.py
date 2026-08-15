from django.contrib import admin
from .models import CropHealthAnalysisLog


@admin.register(CropHealthAnalysisLog)
class CropHealthAnalysisLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'crop_type', 'confidence', 'created_at']
    list_filter = ['crop_type', 'created_at']
    search_fields = ['crop_type', 'symptoms']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
