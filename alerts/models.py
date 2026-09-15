from django.db import models
from django.conf import settings


class Alert(models.Model):
    """tbl_alert — Notifications and alerts scoped per user."""

    class AlertType(models.TextChoices):
        IRRIGATION = 'irrigation', 'Irrigation'
        PEST = 'pest', 'Pest'
        DISEASE = 'disease', 'Disease'
        WEATHER = 'weather', 'Weather'
        SYSTEM = 'system', 'System'

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RESOLVED = 'resolved', 'Resolved'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    complaint = models.ForeignKey('maintenance.Complaint', on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=AlertType.choices, default=AlertType.SYSTEM)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.LOW)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_alert'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title}"

