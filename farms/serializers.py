from rest_framework import serializers
from .models import Farm, Field
from master.models import CropType, SoilType


class FarmSerializer(serializers.ModelSerializer):
    field_count = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = [
            'id', 'name', 'location', 'district', 'state',
            'total_area', 'is_active', 'field_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'field_count']

    def get_field_count(self, obj):
        return obj.fields.count()


class FieldSerializer(serializers.ModelSerializer):
    crop_type_name = serializers.CharField(source='crop_type.name', read_only=True)
    soil_type_name = serializers.CharField(source='soil_type.name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    effective_district = serializers.ReadOnlyField()
    effective_state = serializers.ReadOnlyField()
    location_display = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = [
            'id', 'farm', 'farm_name', 'crop_type', 'crop_type_name',
            'soil_type', 'soil_type_name', 'name', 'area', 'planting_date', 'crop_stage',
            'district', 'state', 'latitude', 'longitude',
            'effective_district', 'effective_state', 'location_display',
            'status', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_location_display(self, obj):
        dist = obj.effective_district
        st = obj.effective_state
        if dist and st:
            return f"{dist}, {st}"
        elif dist:
            return dist
        elif st:
            return st
        return None

