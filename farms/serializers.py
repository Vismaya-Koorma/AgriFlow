from rest_framework import serializers
from .models import (
    Farm, Field, FieldInspectionCriterion, FieldInspection,
    FieldCriterionResult, FieldCorrectiveAction, FieldVerificationHistory
)
from master.models import CropType, SoilType
from master.services import calculate_expected_crop_stage


class FarmSerializer(serializers.ModelSerializer):
    field_count = serializers.SerializerMethodField()
    farmer_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    farmer_username = serializers.CharField(source='user.username', read_only=True, default=None)
    fields_list = serializers.SerializerMethodField()
    next_visit = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = [
            'id', 'user', 'name', 'location', 'district', 'state',
            'total_area', 'is_active', 'field_count', 'farmer_name', 'farmer_username',
            'fields_list', 'next_visit',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'field_count', 'farmer_name', 'farmer_username', 'fields_list', 'next_visit']

    def get_fields_list(self, obj):
        fields = obj.fields.all()
        result = []
        for fld in fields:
            latest = fld.ground_truth_inspections.first()
            result.append({
                'id': fld.id,
                'name': fld.name,
                'crop_type_name': fld.crop_type.name if fld.crop_type else None,
                'crop_variety_name': fld.crop_variety.variety_name if fld.crop_variety else None,
                'crop_stage': fld.crop_stage if fld.crop_variety_id else None,
                'area': fld.area,
                'verification_status': fld.verification_status,
                'reinspection_scheduled_date': str(fld.reinspection_scheduled_date) if fld.reinspection_scheduled_date else None,
                'rejection_reason': latest.rejection_reason if latest else None,
                'latest_inspection_id': latest.id if latest else None,
                'supervisor_name': (latest.supervisor.full_name or latest.supervisor.username) if latest and latest.supervisor else None,
                'inspection_date': str(latest.inspection_date) if latest else None,
                'failed_criteria': [
                    {
                        'id': r.id,
                        'criterion_name': r.criterion.name,
                        'is_critical': r.criterion.is_critical,
                        'measured_value': r.measured_value,
                        'measured_unit': r.measured_unit or r.criterion.threshold_unit,
                        'failure_reason': r.failure_reason,
                        'corrective_action': r.corrective_action,
                        'observation': r.observation
                    }
                    for r in latest.criterion_results.filter(result='fail')
                ] if latest else []
            })
        return result

    def get_next_visit(self, obj):
        try:
            from field_visits.models import FarmVisit
            from django.utils import timezone
            today = timezone.localdate()
            visit = FarmVisit.objects.filter(
                farm=obj,
                scheduled_date__gte=today,
                status=FarmVisit.Status.SCHEDULED
            ).order_by('scheduled_date', 'scheduled_start_time').first()
            if not visit:
                return None
            return {
                'id': visit.id,
                'scheduled_date': str(visit.scheduled_date),
                'start_time': str(visit.scheduled_start_time)[:5] if visit.scheduled_start_time else None,
                'end_time': str(visit.scheduled_end_time)[:5] if visit.scheduled_end_time else None,
                'supervisor_name': visit.supervisor.full_name or visit.supervisor.username,
                'supervisor_phone': getattr(visit.supervisor, 'phone_number', None) or getattr(visit.supervisor, 'phone', None),
                'status': visit.status,
                'status_display': visit.get_status_display(),
            }
        except Exception:
            return None
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
    farmer_id = serializers.IntegerField(source='farm.user_id', read_only=True)
    farmer_name = serializers.CharField(source='farm.user.full_name', read_only=True, default=None)
    farmer_username = serializers.CharField(source='farm.user.username', read_only=True, default=None)
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
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True, default=None)
    latest_inspection_summary = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = [
            'id', 'farm', 'farm_name', 'farmer_id', 'farmer_name', 'farmer_username',
            'crop_type', 'crop_type_name',
            'crop_variety', 'crop_variety_name',
            'soil_type', 'soil_type_name', 'name', 'area', 'planting_date', 'crop_stage',
            'days_after_planting', 'calculated_crop_stage', 'calculated_crop_stage_display',
            'next_expected_stage', 'next_expected_stage_display', 'days_until_next_stage',
            'stage_source_reference', 'has_stage_duration_data',
            'district', 'state', 'latitude', 'longitude',
            'effective_district', 'effective_state', 'location_display',
            'verification_status', 'verified_by', 'verified_by_username', 'verified_by_name',
            'reinspection_scheduled_date', 'latest_inspection_summary',
            'status', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'verification_status', 'verified_by', 'created_at', 'updated_at']

    def _get_stage_info(self, obj):
        if not hasattr(obj, '_cached_stage_info'):
            obj._cached_stage_info = calculate_expected_crop_stage(
                crop_variety=obj.crop_variety,
                planting_date=obj.planting_date,
                fallback_stage=obj.crop_stage if obj.crop_variety_id else None,
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

    def get_latest_inspection_summary(self, obj):
        if not obj.pk:
            return None
        latest = obj.ground_truth_inspections.first()
        if not latest:
            return None
        return {
            'id': latest.id,
            'decision': latest.decision,
            'inspection_date': latest.inspection_date,
            'supervisor_name': latest.supervisor.full_name or latest.supervisor.username,
            'rejection_reason': latest.rejection_reason,
            'reinspection_scheduled_date': latest.reinspection_scheduled_date,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # When crop variety is not added, do not show or compute crop stage
        # because crop stage prediction requires knowing the crop variety.
        if not instance.crop_variety_id:
            data['crop_stage'] = None
            data['calculated_crop_stage'] = None
            data['calculated_crop_stage_display'] = None
            data['next_expected_stage'] = None
            data['next_expected_stage_display'] = None
            data['days_after_planting'] = None
            data['days_until_next_stage'] = None
        return data


class FieldInspectionCriterionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = FieldInspectionCriterion
        fields = [
            'id', 'category', 'category_display', 'name', 'description',
            'is_mandatory', 'is_critical', 'acceptance_guideline',
            'threshold_unit', 'min_threshold', 'max_threshold',
            'applicable_crop_types', 'applicable_stages',
            'order', 'is_active', 'created_at', 'updated_at'
        ]


class FieldCriterionResultSerializer(serializers.ModelSerializer):
    criterion_name = serializers.CharField(source='criterion.name', read_only=True)
    criterion_category = serializers.CharField(source='criterion.get_category_display', read_only=True)
    criterion_is_critical = serializers.BooleanField(source='criterion.is_critical', read_only=True)
    criterion_is_mandatory = serializers.BooleanField(source='criterion.is_mandatory', read_only=True)

    class Meta:
        model = FieldCriterionResult
        fields = [
            'id', 'criterion', 'criterion_name', 'criterion_category',
            'criterion_is_critical', 'criterion_is_mandatory',
            'result', 'observation', 'measured_value', 'measured_unit',
            'failure_reason', 'corrective_action'
        ]


class FieldCorrectiveActionSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)
    farm_name = serializers.CharField(source='field.farm.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = FieldCorrectiveAction
        fields = [
            'id', 'field', 'field_name', 'farm_name', 'inspection',
            'criterion_result', 'action_description', 'status', 'status_display',
            'due_date', 'resolved_at', 'resolution_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'field', 'inspection', 'criterion_result', 'created_at', 'updated_at']


class FieldVerificationHistorySerializer(serializers.ModelSerializer):
    action_by_username = serializers.CharField(source='action_by.username', read_only=True)
    action_by_name = serializers.CharField(source='action_by.full_name', read_only=True)

    class Meta:
        model = FieldVerificationHistory
        fields = [
            'id', 'field', 'inspection', 'action_by', 'action_by_username',
            'action_by_name', 'previous_status', 'new_status', 'decision',
            'reason', 'failed_criteria_summary', 'created_at'
        ]


class FieldInspectionSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    supervisor_username = serializers.CharField(source='supervisor.username', read_only=True)
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    farmer_username = serializers.CharField(source='farmer.username', read_only=True)
    criterion_results = FieldCriterionResultSerializer(many=True, read_only=True)
    corrective_actions = FieldCorrectiveActionSerializer(many=True, read_only=True)

    class Meta:
        model = FieldInspection
        fields = [
            'id', 'field', 'field_name', 'farm', 'farm_name',
            'supervisor', 'supervisor_name', 'supervisor_username',
            'farmer', 'farmer_name', 'farmer_username',
            'decision', 'overall_notes', 'rejection_reason',
            'reinspection_scheduled_date', 'is_reinspection',
            'inspection_date', 'criterion_results', 'corrective_actions', 'updated_at'
        ]
