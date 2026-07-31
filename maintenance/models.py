from django.db import models


class Complaint(models.Model):
    """tbl_complaint"""

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    class Category(models.TextChoices):
        IRRIGATION = 'irrigation', 'Irrigation Equipment'
        PUMP = 'pump', 'Pump'
        SENSOR = 'sensor', 'Sensor'
        VALVE = 'valve', 'Valve'
        GENERAL = 'general', 'General'

    submitted_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='complaints_submitted'
    )
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='complaints_assigned'
    )
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_complaint'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.title}"


class ComplaintUpdate(models.Model):
    """tbl_complaint_update — Each complaint can have multiple updates."""

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='updates')
    updated_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='complaint_updates')
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
        return f"Update on {self.complaint.title} by {self.updated_by.username}"
