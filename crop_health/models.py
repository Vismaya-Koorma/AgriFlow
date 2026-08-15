from django.db import models
from accounts.models import User
from farms.models import Field


class CropHealthAnalysisLog(models.Model):
    """Store crop health analysis history in tbl_crop_health_analysis_log."""

    INPUT_TYPE_CHOICES = (
        ('text', 'Text Analysis'),
        ('image', 'Image Analysis'),
        ('both', 'Text & Image Analysis'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crop_health_analyses')
    field = models.ForeignKey(Field, on_delete=models.SET_NULL, null=True, blank=True, related_name='crop_health_analyses')

    crop_type = models.CharField(max_length=100)
    input_type = models.CharField(max_length=20, choices=INPUT_TYPE_CHOICES, default='text')
    symptoms = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='crop_health_leaves/', null=True, blank=True)

    status = models.CharField(max_length=100, default='Healthy')
    predicted_disease = models.CharField(max_length=150, blank=True, default='')

    # JSON fields for structured AI response
    possible_causes = models.JSONField(default=list)
    fertilizer = models.JSONField(default=list)
    watering_advice = models.TextField(blank=True)
    prevention = models.JSONField(default=list)
    confidence = models.FloatField(default=90.0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_crop_health_analysis_log'
        ordering = ['-created_at']

    def __str__(self):
        return f"CropHealth [{self.crop_type} - {self.input_type}] - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
