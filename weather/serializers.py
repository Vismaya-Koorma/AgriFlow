from rest_framework import serializers
from .models import WeatherData


class WeatherDataSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = WeatherData
        fields = [
            'id', 'field', 'field_name', 'temperature', 'humidity',
            'rainfall', 'wind_speed', 'wind_direction', 'condition', 'recorded_at',
        ]
        read_only_fields = ['id', 'recorded_at']
