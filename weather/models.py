from django.db import models


class WeatherData(models.Model):
    """tbl_weather_data — Many weather records per field."""

    class Condition(models.TextChoices):
        SUNNY = 'sunny', 'Sunny'
        CLOUDY = 'cloudy', 'Cloudy'
        RAINY = 'rainy', 'Rainy'
        WINDY = 'windy', 'Windy'
        FOGGY = 'foggy', 'Foggy'
        THUNDERSTORM = 'thunderstorm', 'Thunderstorm'

    field = models.ForeignKey('farms.Field', on_delete=models.CASCADE, related_name='weather_records')
    temperature = models.DecimalField(max_digits=5, decimal_places=2, help_text='Celsius')
    humidity = models.DecimalField(max_digits=5, decimal_places=2, help_text='Percentage')
    rainfall = models.DecimalField(max_digits=7, decimal_places=2, default=0, help_text='mm')
    wind_speed = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text='km/h')
    wind_direction = models.CharField(max_length=10, blank=True, null=True)
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.SUNNY)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_weather_data'
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Weather @ {self.field.name} on {self.recorded_at.date()}"
