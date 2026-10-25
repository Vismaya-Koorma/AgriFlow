from rest_framework import serializers
from django.utils import timezone
from accounts.models import User
from farms.models import Farm, Field
from .models import (
    SupervisorFarmAssignment,
    RecurringFarmVisitSchedule,
    FarmVisit,
    FarmInspectionReport,
    ScheduleChangeHistory,
    WEEKDAY_CHOICES
)
from .services import validate_schedule_conflict


class FarmInspectionReportSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True, default=None)

    class Meta:
        model = FarmInspectionReport
        fields = [
            'id',
            'visit',
            'supervisor',
            'supervisor_name',
            'farmer',
            'farmer_name',
            'farm',
            'farm_name',
            'field',
            'field_name',
            'crop_condition',
            'crop_growth_stage',
            'soil_and_field_observations',
            'irrigation_system_status',
            'water_availability_and_observations',
            'pest_or_disease_symptoms',
            'fertilizer_or_pesticide_observations',
            'recommended_agricultural_actions',
            'maintenance_issues',
            'follow_up_required',
            'follow_up_notes',
            'next_recommended_visit_date',
            'additional_remarks',
            'submitted_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'supervisor', 'farmer', 'farm', 'field', 'submitted_at', 'updated_at']


class FarmVisitSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()
    supervisor_phone = serializers.CharField(source='supervisor.phone_number', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    farmer_name = serializers.SerializerMethodField()
    farmer_phone = serializers.CharField(source='farmer.phone_number', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    farm_location = serializers.CharField(source='farm.location', read_only=True)
    farm_district = serializers.CharField(source='farm.district', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True, default=None)
    inspection_report = FarmInspectionReportSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = FarmVisit
        fields = [
            'id',
            'assignment',
            'supervisor',
            'supervisor_name',
            'supervisor_phone',
            'supervisor_email',
            'farmer',
            'farmer_name',
            'farmer_phone',
            'farm',
            'farm_name',
            'farm_location',
            'farm_district',
            'field',
            'field_name',
            'scheduled_date',
            'scheduled_start_time',
            'scheduled_end_time',
            'actual_start_time',
            'actual_end_time',
            'status',
            'status_display',
            'rescheduled_from_date',
            'rescheduled_reason',
            'cancellation_reason',
            'cancelled_at',
            'is_supervisor_recorded',
            'unique_occurrence_key',
            'inspection_report',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'unique_occurrence_key', 'created_at', 'updated_at'
        ]

    def get_supervisor_name(self, obj):
        return obj.supervisor.full_name or obj.supervisor.username if obj.supervisor else 'Unassigned'

    def get_farmer_name(self, obj):
        return obj.farmer.full_name or obj.farmer.username if obj.farmer else 'Unknown'


class RecurringFarmVisitScheduleSerializer(serializers.ModelSerializer):
    weekly_visit_day_display = serializers.CharField(source='get_weekly_visit_day_display', read_only=True)

    class Meta:
        model = RecurringFarmVisitSchedule
        fields = [
            'id',
            'assignment',
            'weekly_visit_day',
            'weekly_visit_day_display',
            'start_time',
            'end_time',
            'effective_from',
            'effective_to',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupervisorFarmAssignmentSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    supervisor_phone = serializers.CharField(source='supervisor.phone_number', read_only=True)
    farmer_name = serializers.SerializerMethodField()
    farmer_email = serializers.CharField(source='farmer.email', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    farm_location = serializers.CharField(source='farm.location', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True, default=None)
    weekly_visit_day_display = serializers.CharField(source='get_weekly_visit_day_display', read_only=True)
    recurring_schedule = RecurringFarmVisitScheduleSerializer(read_only=True)

    class Meta:
        model = SupervisorFarmAssignment
        fields = [
            'id',
            'supervisor',
            'supervisor_name',
            'supervisor_email',
            'supervisor_phone',
            'farmer',
            'farmer_name',
            'farmer_email',
            'farm',
            'farm_name',
            'farm_location',
            'field',
            'field_name',
            'weekly_visit_day',
            'weekly_visit_day_display',
            'start_time',
            'end_time',
            'start_date',
            'end_date',
            'is_active',
            'assigned_by',
            'last_actual_visit_date',
            'recurring_schedule',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'last_actual_visit_date', 'created_at', 'updated_at']

    def get_supervisor_name(self, obj):
        return obj.supervisor.full_name or obj.supervisor.username if obj.supervisor else 'Unassigned'

    def get_farmer_name(self, obj):
        return obj.farmer.full_name or obj.farmer.username if obj.farmer else 'Unknown'

    def validate(self, attrs):
        supervisor = attrs.get('supervisor') or (self.instance.supervisor if self.instance else None)
        weekly_visit_day = attrs.get('weekly_visit_day', getattr(self.instance, 'weekly_visit_day', 0))
        start_time = attrs.get('start_time') or (self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time') or (self.instance.end_time if self.instance else None)
        farm = attrs.get('farm') or (self.instance.farm if self.instance else None)
        farmer = attrs.get('farmer') or (self.instance.farmer if self.instance else None)

        if farm and farmer and farm.user != farmer:
            raise serializers.ValidationError({'farmer': f"Farm '{farm.name}' does not belong to farmer '{farmer.username}'."})

        # Validate schedule conflict for supervisor across different farms
        if supervisor and start_time and end_time:
            validate_schedule_conflict(
                supervisor=supervisor,
                weekly_visit_day=weekly_visit_day,
                start_time=start_time,
                end_time=end_time,
                exclude_assignment_id=self.instance.id if self.instance else None
            )

        return attrs


class ScheduleChangeHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = ScheduleChangeHistory
        fields = [
            'id',
            'assignment',
            'changed_by',
            'changed_by_name',
            'change_type',
            'previous_schedule_details',
            'new_schedule_details',
            'reason',
            'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
