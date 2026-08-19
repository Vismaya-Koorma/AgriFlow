# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import SoilMoistureEstimation, IrrigationRecommendation, CropStressRisk, IrrigationPriority
class SoilMoistureEstimationSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = SoilMoistureEstimation
        fields = ['id', 'field', 'field_name', 'estimated_moisture', 'confidence_score', 'estimated_at', 'model_version']
        read_only_fields = ['id', 'estimated_at']


class IrrigationRecommendationSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = IrrigationRecommendation
        fields = [
            'id', 'field', 'field_name', 'recommendation_status',
            'recommended_volume_litres', 'recommended_duration_minutes', 'reason', 'generated_at',
        ]
        read_only_fields = ['id', 'generated_at']


class CropStressRiskSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = CropStressRisk
        fields = ['id', 'field', 'field_name', 'risk_level', 'stress_score', 'factors', 'assessed_at']
        read_only_fields = ['id', 'assessed_at']


class IrrigationPrioritySerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = IrrigationPriority
        fields = ['id', 'field', 'field_name', 'priority_score', 'priority_rank', 'notes', 'generated_at']
        read_only_fields = ['id', 'generated_at']
