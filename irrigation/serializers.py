from rest_framework import serializers
from .models import IrrigationHistory, RainfallConfirmation


class IrrigationHistorySerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = IrrigationHistory
        fields = [
            'id', 'field', 'field_name', 'method', 'water_source',
            'volume_litres', 'duration_minutes', 'field_condition', 'created_by', 'irrigated_at', 'notes',
        ]
        read_only_fields = ['id', 'irrigated_at', 'created_by']


class RainfallConfirmationSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = RainfallConfirmation
        fields = [
            'id', 'field', 'field_name', 'rainfall_mm',
            'confirmed_at', 'confirmed_by', 'notes',
        ]
        read_only_fields = ['id', 'confirmed_at']
