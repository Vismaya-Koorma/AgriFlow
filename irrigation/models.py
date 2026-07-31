from django.db import models


class IrrigationHistory(models.Model):
    """tbl_irrigation_history — Many irrigation records per field."""

    class Method(models.TextChoices):
        DRIP = 'drip', 'Drip'
        SPRINKLER = 'sprinkler', 'Sprinkler'
        FLOOD = 'flood', 'Flood'
        MANUAL = 'manual', 'Manual'
        SURFACE = 'surface', 'Surface'

    class Source(models.TextChoices):
        CANAL = 'canal', 'Canal'
        BOREWELL = 'borewell', 'Borewell'
        RAIN = 'rain', 'Rainwater'
        RIVER = 'river', 'River'
        TANK = 'tank', 'Tank'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='irrigation_history')
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.DRIP)
    water_source = models.CharField(max_length=20, choices=Source.choices, default=Source.CANAL)
    volume_litres = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    irrigated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_irrigation_history'
        ordering = ['-irrigated_at']

    def __str__(self):
        return f"{self.field.name} — {self.volume_litres}L on {self.irrigated_at.date()}"


class RainfallConfirmation(models.Model):
    """tbl_rainfall_confirmation"""

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='rainfall_confirmations')
    rainfall_mm = models.DecimalField(max_digits=7, decimal_places=2)
    confirmed_at = models.DateTimeField(auto_now_add=True)
    confirmed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='rainfall_confirmations'
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_rainfall_confirmation'
        ordering = ['-confirmed_at']

    def __str__(self):
        return f"{self.field.name} — {self.rainfall_mm}mm on {self.confirmed_at.date()}"
