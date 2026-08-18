from rest_framework import serializers
from .models import SimulationHistory


class SimulationHistorySerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = SimulationHistory
        fields = [
            'id', 'created_by', 'created_by_username', 'original_water_liters',
            'simulated_water_liters', 'reduction_percentage', 'total_fields_count',
            'affected_fields_count', 'major_affected_field', 'summary',
            'action_plan_snapshot', 'created_at'
        ]
