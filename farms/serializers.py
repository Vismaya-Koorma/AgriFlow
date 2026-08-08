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

    class Meta:
        model = Field
        fields = [
            'id', 'farm', 'farm_name', 'crop_type', 'crop_type_name',
            'soil_type', 'soil_type_name', 'name', 'area', 'planting_date', 'crop_stage',
            'latitude', 'longitude', 'status', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
