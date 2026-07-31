from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'field', 'field_name', 'alert_type', 'severity',
            'title', 'message', 'is_resolved', 'resolved_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
