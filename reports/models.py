from django.db import models


class Report(models.Model):
    """tbl_report"""

    class ReportType(models.TextChoices):
        IRRIGATION = 'irrigation', 'Irrigation Report'
        CROP = 'crop', 'Crop Report'
        WEATHER = 'weather', 'Weather Report'
        FARM = 'farm', 'Farm Summary'
        ALERT = 'alert', 'Alert Report'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GENERATED = 'generated', 'Generated'
        FAILED = 'failed', 'Failed'

    generated_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='reports')
    farm = models.ForeignKey('farms.Farm', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    title = models.CharField(max_length=255)
    content = models.JSONField(default=dict, help_text='Report data as JSON')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_report'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report_type} — {self.title}"
