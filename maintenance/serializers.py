from rest_framework import serializers
from .models import Complaint, ComplaintUpdate


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintUpdate
        fields = ['id', 'complaint', 'updated_by', 'message', 'status_changed_to', 'created_at']
        read_only_fields = ['id', 'updated_by', 'created_at']


class ComplaintSerializer(serializers.ModelSerializer):
    updates = ComplaintUpdateSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'submitted_by', 'submitted_by_name', 'assigned_to',
            'category', 'title', 'description', 'status',
            'updates', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'submitted_by', 'created_at', 'updated_at']
