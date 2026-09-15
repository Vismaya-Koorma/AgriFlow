from rest_framework import serializers
from .models import CropType, SoilType, CropVariety, CropWaterRequirement


class CropTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropType
        fields = ['id', 'name', 'crop_value', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class SoilTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoilType
        fields = ['id', 'name', 'description', 'water_retention', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class CropVarietySerializer(serializers.ModelSerializer):
    crop_name = serializers.ReadOnlyField(source='crop.name')

    class Meta:
        model = CropVariety
        fields = ['id', 'crop', 'crop_name', 'variety_name', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class CropWaterRequirementSerializer(serializers.ModelSerializer):
    crop_name = serializers.ReadOnlyField(source='crop.name')
    variety_name = serializers.CharField(source='variety.variety_name', read_only=True, default=None)
    soil_type_name = serializers.CharField(source='soil_type.name', read_only=True, default=None)
    crop_stage_display = serializers.CharField(source='get_crop_stage_display', read_only=True)

    class Meta:
        model = CropWaterRequirement
        fields = [
            'id', 'crop', 'crop_name', 'variety', 'variety_name',
            'crop_stage', 'crop_stage_display', 'soil_type', 'soil_type_name',
            'min_water', 'optimal_water', 'max_water', 'unit',
            'source_reference', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

