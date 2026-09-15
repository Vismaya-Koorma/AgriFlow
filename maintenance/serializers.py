from rest_framework import serializers
from .models import Complaint, ComplaintUpdate


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True)

    class Meta:
        model = ComplaintUpdate
        fields = [
            'id', 'complaint', 'updated_by', 'updated_by_name',
            'progress', 'message', 'status_changed_to', 'created_at'
        ]
        read_only_fields = ['id', 'updated_by', 'created_at']


class ComplaintSerializer(serializers.ModelSerializer):
    updates = ComplaintUpdateSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_id', 'submitted_by', 'submitted_by_name',
            'assigned_to', 'assigned_to_name', 'farm', 'farm_name',
            'field', 'field_name', 'category', 'title', 'description',
            'priority', 'status', 'progress', 'complaint_image',
            'completion_notes', 'completion_image', 'completed_at',
            'updates', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'complaint_id', 'submitted_by', 'created_at', 'updated_at']

