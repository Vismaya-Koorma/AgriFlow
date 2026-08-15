from rest_framework import serializers
from .models import CropHealthAnalysisLog


class CropHealthAnalysisLogSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)

    class Meta:
        model = CropHealthAnalysisLog
        fields = [
            'id', 'user', 'field', 'field_name', 'crop_type',
            'input_type', 'symptoms', 'image', 'status',
            'predicted_disease', 'possible_causes', 'fertilizer',
            'watering_advice', 'prevention', 'confidence', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
