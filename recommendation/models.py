from django.db import models


class SoilMoistureEstimation(models.Model):
    """tbl_soil_moisture_estimation — AI output only"""

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='soil_moisture_estimations')
    estimated_moisture = models.DecimalField(max_digits=5, decimal_places=2, help_text='Percentage')
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    estimated_at = models.DateTimeField(auto_now_add=True)
    model_version = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'tbl_soil_moisture_estimation'
        ordering = ['-estimated_at']

    def __str__(self):
        return f"{self.field.name} — Moisture: {self.estimated_moisture}%"


class IrrigationRecommendation(models.Model):
    """tbl_irrigation_recommendation — AI output only"""

    class Status(models.TextChoices):
        IRRIGATE = 'irrigate', 'Irrigate'
        MONITOR = 'monitor', 'Monitor'
        POSTPONE = 'postpone', 'Postpone'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='irrigation_recommendations')
    recommendation_status = models.CharField(max_length=20, choices=Status.choices, default=Status.MONITOR)
    recommended_volume_litres = models.DecimalField(max_digits=10, decimal_places=2)
    recommended_duration_minutes = models.PositiveIntegerField()
    reason = models.TextField(blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_irrigation_recommendation'
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.field.name} — {self.recommendation_status}"


class CropStressRisk(models.Model):
    """tbl_crop_stress_risk — AI output only"""

    class RiskLevel(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='crop_stress_records')
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.LOW)
    stress_score = models.DecimalField(max_digits=5, decimal_places=2)
    factors = models.JSONField(default=dict, blank=True, help_text='Dict of contributing factors')
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_crop_stress_risk'
        ordering = ['-assessed_at']

    def __str__(self):
        return f"{self.field.name} — Risk: {self.risk_level}"


class IrrigationPriority(models.Model):
    """tbl_irrigation_priority — AI output only"""

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='irrigation_priorities')
    priority_score = models.DecimalField(max_digits=5, decimal_places=2)
    priority_rank = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_irrigation_priority'
        ordering = ['priority_rank']

    def __str__(self):
        return f"{self.field.name} — Priority Rank: {self.priority_rank}"
