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
    rainfall_option_display = serializers.CharField(source='get_rainfall_option_display', read_only=True)

    def __str__(self):
        return f"{self.field.name} — {self.get_rainfall_option_display()} on {self.confirmed_at.date()}"


# ─── WATER RESOURCE MANAGER SERIALIZERS ───────────────────────────────────────

from .models import WaterSource, WaterLevelHistory, WaterAllocationRequest, WaterAllocation, WaterUsage


class WaterSourceSerializer(serializers.ModelSerializer):
    available_liters = serializers.ReadOnlyField()
    percentage_level = serializers.ReadOnlyField()
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WaterSource
        fields = [
            'id', 'name', 'source_type', 'source_type_display', 'location',
            'capacity_liters', 'current_level_liters', 'reserved_liters',
            'available_liters', 'percentage_level', 'status', 'status_display',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class WaterLevelHistorySerializer(serializers.ModelSerializer):
    water_source_name = serializers.CharField(source='water_source.name', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = WaterLevelHistory
        fields = [
            'id', 'water_source', 'water_source_name', 'previous_level_liters',
            'new_level_liters', 'change_amount_liters', 'reason', 'updated_by',
            'updated_by_username', 'recorded_at'
        ]
        read_only_fields = ['id', 'recorded_at']


class WaterAllocationRequestSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    farmer_username = serializers.CharField(source='farmer.username', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True)
    location = serializers.CharField(source='farm.location', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = WaterAllocationRequest
        fields = [
            'id', 'farmer', 'farmer_name', 'farmer_username', 'farm', 'farm_name',
            'field', 'field_name', 'location', 'requested_amount_liters',
            'approved_amount_liters', 'priority', 'priority_display', 'status',
            'status_display', 'reason', 'requested_at', 'reviewed_at', 'reviewed_by',
            'reviewed_by_username', 'recommendation'
        ]
        read_only_fields = ['id', 'farmer', 'farm', 'status', 'approved_amount_liters', 'requested_at', 'reviewed_at', 'reviewed_by']


class WaterAllocationSerializer(serializers.ModelSerializer):
    water_source_name = serializers.CharField(source='water_source.name', read_only=True)
    water_source_type = serializers.CharField(source='water_source.get_source_type_display', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True)
    location = serializers.CharField(source='farm.location', read_only=True)
    farmer_name = serializers.CharField(source='farm.user.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    remaining_amount_liters = serializers.ReadOnlyField()

    class Meta:
        model = WaterAllocation
        fields = [
            'id', 'request', 'water_source', 'water_source_name', 'water_source_type',
            'farm', 'farm_name', 'field', 'field_name', 'location', 'farmer_name',
            'allocated_amount_liters', 'used_amount_liters', 'remaining_amount_liters',
            'status', 'status_display', 'allocated_at', 'allocated_by'
        ]
        read_only_fields = ['id', 'allocated_at', 'allocated_by']


class WaterUsageSerializer(serializers.ModelSerializer):
    water_source_name = serializers.CharField(source='water_source.name', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True)
    farm_name = serializers.CharField(source='field.farm.name', read_only=True)
    recorded_by_username = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = WaterUsage
        fields = [
            'id', 'allocation', 'water_source', 'water_source_name', 'field',
            'field_name', 'farm_name', 'volume_liters', 'used_at', 'recorded_by',
            'recorded_by_username', 'notes'
        ]
        read_only_fields = ['id', 'used_at', 'recorded_by']

