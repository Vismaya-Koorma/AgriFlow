from django.db import models
from farms.models import Farm, Field


class AIRecommendationLog(models.Model):
    """Store every AI Irrigation prediction in tbl_ai_recommendation_log."""

    STRESS_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    field = models.ForeignKey(Field, on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_recommendations')
    farm = models.ForeignKey(Farm, on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_recommendations')

    irrigation_needed = models.BooleanField(default=False)
    recommended_water_l_m2 = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    crop_stress = models.CharField(max_length=10, choices=STRESS_CHOICES, default='Low')
    confidence = models.IntegerField(default=0, help_text='Confidence percentage 0-100')
    reason = models.TextField(blank=True)

    # Input snapshot for audit
    temperature = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    humidity = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    rainfall = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    wind_speed = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    days_since_irrigation = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_ai_recommendation_log'
        ordering = ['-created_at']

    def __str__(self):
        label = self.field.name if self.field else (self.farm.name if self.farm else 'Unknown')
        return f"AI Rec [{label}] - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
