from django.contrib import admin
from .models import Complaint, ComplaintUpdate


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'submitted_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'submitted_by__username')
    ordering = ('-created_at',)


@admin.register(ComplaintUpdate)
class ComplaintUpdateAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'updated_by', 'status_changed_to', 'created_at')
    search_fields = ('complaint__title', 'updated_by__username')
    ordering = ('-created_at',)
