from rest_framework import serializers
from .models import CropType, SoilType


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
