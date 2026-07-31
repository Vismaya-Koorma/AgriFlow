from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('title', 'alert_type', 'severity', 'field', 'is_resolved', 'created_at')
    list_filter = ('alert_type', 'severity', 'is_resolved')
    search_fields = ('title', 'field__name')
    ordering = ('-created_at',)
