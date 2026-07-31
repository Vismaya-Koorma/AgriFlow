from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'report_type', 'status', 'generated_by', 'period_start', 'period_end', 'created_at')
    list_filter = ('report_type', 'status')
    search_fields = ('title', 'generated_by__username')
    ordering = ('-created_at',)
