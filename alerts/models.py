from django.db import models


class Alert(models.Model):
    """tbl_alert — Many alerts per field."""

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

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=AlertType.choices, default=AlertType.SYSTEM)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.LOW)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_alert'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title}"
