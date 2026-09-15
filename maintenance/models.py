from django.db import models
from django.conf import settings


class Complaint(models.Model):
    """tbl_complaint — Maintenance complaints submitted by farmers."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        IN_PROGRESS = 'in_progress', 'In Progress'
        ON_HOLD = 'on_hold', 'On Hold'
        COMPLETED = 'completed', 'Completed'

    class Category(models.TextChoices):
        IRRIGATION = 'irrigation', 'Irrigation System Problem'
        WATER_LEAKAGE = 'water_leakage', 'Water Leakage'
        PUMP = 'pump', 'Pump Problem'
        PIPE = 'pipe', 'Pipe Problem'
        SPRINKLER = 'sprinkler', 'Sprinkler Problem'
        DRIP = 'drip', 'Drip System Problem'
        WATERING = 'watering', 'Field Watering Issue'
        OTHER = 'other', 'Other'

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    complaint_id = models.CharField(max_length=30, unique=True, blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='complaints_submitted'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='complaints_assigned'
    )
    farm = models.ForeignKey(
        'farms.Farm', on_delete=models.CASCADE,
        null=True, blank=True, related_name='complaints'
    )
    field = models.ForeignKey(
        'farms.Field', on_delete=models.CASCADE,
        null=True, blank=True, related_name='complaints'
    )
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress = models.IntegerField(default=0, help_text="Percentage completed (0-100)")
    
    complaint_image = models.FileField(upload_to='complaints/', null=True, blank=True)
    completion_notes = models.TextField(null=True, blank=True)
    completion_image = models.FileField(upload_to='complaints/completion/', null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_complaint'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.complaint_id:
            self.complaint_id = f"CMP-{self.id:04d}"
            super().save(update_fields=['complaint_id'])

    def __str__(self):
        return f"[{self.complaint_id or self.id}] {self.title} ({self.status})"


class ComplaintUpdate(models.Model):
    """tbl_complaint_update — Timeline updates on complaints by worker/farmer."""

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='updates')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='complaint_updates')
    progress = models.IntegerField(default=0)
    message = models.TextField()
    status_changed_to = models.CharField(
        max_length=20,
        choices=Complaint.Status.choices,
        blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_complaint_update'
        ordering = ['created_at']

    def __str__(self):
        return f"Update on {self.complaint.title} ({self.progress}%) by {self.updated_by.username}"

