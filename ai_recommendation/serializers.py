from rest_framework import serializers
from .models import AIRecommendationLog


class AIRecommendationLogSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)

    class Meta:
        model = AIRecommendationLog
        fields = [
            'id', 'field', 'field_name', 'farm', 'farm_name',
            'irrigation_needed', 'recommended_water_l_m2', 'crop_stress',
            'confidence', 'reason',
            'temperature', 'humidity', 'rainfall', 'wind_speed', 'days_since_irrigation',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
