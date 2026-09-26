from rest_framework import serializers
from .models import Farm, Field
from master.models import CropType, SoilType
from master.services import calculate_expected_crop_stage


class FarmSerializer(serializers.ModelSerializer):
    field_count = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = [
            'id', 'name', 'location', 'district', 'state',
            'total_area', 'is_active', 'field_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'field_count']
        extra_kwargs = {
            'state': {'required': False, 'allow_blank': True, 'default': 'Kerala'},
            'district': {'required': False, 'allow_blank': True, 'default': ''},
            'location': {'required': False, 'allow_blank': True, 'default': ''},
        }

    def get_field_count(self, obj):
        return obj.fields.count()


class FieldSerializer(serializers.ModelSerializer):
    crop_type_name = serializers.CharField(source='crop_type.name', read_only=True)
    crop_variety_name = serializers.CharField(source='crop_variety.variety_name', read_only=True, default=None)
    soil_type_name = serializers.CharField(source='soil_type.name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    effective_district = serializers.ReadOnlyField()
    effective_state = serializers.ReadOnlyField()
    location_display = serializers.SerializerMethodField()

    # Dynamic Automatic Crop Stage Calculations
    days_after_planting = serializers.SerializerMethodField()
    calculated_crop_stage = serializers.SerializerMethodField()
    calculated_crop_stage_display = serializers.SerializerMethodField()
    next_expected_stage = serializers.SerializerMethodField()
    next_expected_stage_display = serializers.SerializerMethodField()
    days_until_next_stage = serializers.SerializerMethodField()
    stage_source_reference = serializers.SerializerMethodField()
    has_stage_duration_data = serializers.SerializerMethodField()

    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, default=None)

    class Meta:
        model = Field
        fields = [
            'id', 'farm', 'farm_name', 'crop_type', 'crop_type_name',
            'crop_variety', 'crop_variety_name',
            'soil_type', 'soil_type_name', 'name', 'area', 'planting_date', 'crop_stage',
            'days_after_planting', 'calculated_crop_stage', 'calculated_crop_stage_display',
            'next_expected_stage', 'next_expected_stage_display', 'days_until_next_stage',
            'stage_source_reference', 'has_stage_duration_data',
            'district', 'state', 'latitude', 'longitude',
            'effective_district', 'effective_state', 'location_display',
            'verification_status', 'verified_by', 'verified_by_username',
            'status', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'verification_status', 'verified_by', 'created_at', 'updated_at']

    def _get_stage_info(self, obj):
        if not hasattr(obj, '_cached_stage_info'):
            obj._cached_stage_info = calculate_expected_crop_stage(
                crop_variety=obj.crop_variety,
                planting_date=obj.planting_date,
                fallback_stage=obj.crop_stage,
                crop_type=obj.crop_type
            )
        return obj._cached_stage_info



    def get_days_after_planting(self, obj):
        return self._get_stage_info(obj)['days_after_planting']

    def get_calculated_crop_stage(self, obj):
        return self._get_stage_info(obj)['current_expected_stage']

    def get_calculated_crop_stage_display(self, obj):
        return self._get_stage_info(obj)['current_expected_stage_display']

    def get_next_expected_stage(self, obj):
        return self._get_stage_info(obj)['next_expected_stage']

    def get_next_expected_stage_display(self, obj):
        return self._get_stage_info(obj)['next_expected_stage_display']

    def get_days_until_next_stage(self, obj):
        return self._get_stage_info(obj)['days_until_next_stage']

    def get_stage_source_reference(self, obj):
        return self._get_stage_info(obj)['source_reference']

    def get_has_stage_duration_data(self, obj):
        return self._get_stage_info(obj)['has_stage_data']

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


