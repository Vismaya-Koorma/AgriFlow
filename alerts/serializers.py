from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True, default=None)
    farm_name = serializers.CharField(source='farm.name', read_only=True, default=None)

    class Meta:
        model = Alert
        fields = [
            'id', 'user', 'farm', 'farm_name', 'field', 'field_name', 'complaint',
            'alert_type', 'severity', 'title', 'message',
            'is_read', 'status', 'is_resolved', 'resolved_at', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'created_at']

