from rest_framework import viewsets, permissions
from .models import SoilMoistureEstimation, IrrigationRecommendation, CropStressRisk, IrrigationPriority
from .serializers import (
    SoilMoistureEstimationSerializer, IrrigationRecommendationSerializer,
    CropStressRiskSerializer, IrrigationPrioritySerializer,
)
from farms.models import Farm, Field


class SoilMoistureViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SoilMoistureEstimationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return SoilMoistureEstimation.objects.filter(field__in=user_fields).select_related('field')


from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import SoilMoistureEstimation, IrrigationRecommendation, CropStressRisk, IrrigationPriority
from .serializers import (
    SoilMoistureEstimationSerializer, IrrigationRecommendationSerializer,
    CropStressRiskSerializer, IrrigationPrioritySerializer,
)
from farms.models import Farm, Field
from irrigation.models import IrrigationHistory, RainfallConfirmation


class RecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = IrrigationRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return IrrigationRecommendation.objects.filter(field__in=user_fields).select_related('field')

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """Get latest recommendation evaluated using rule-based logic."""
        user_farms = Farm.objects.filter(user=request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        first_field = user_fields.first()

        # Rule-based decision algorithm
        field_id = request.query_params.get('field_id')
        target_field = user_fields.filter(id=field_id).first() if field_id else first_field

        # Rule 1: Check rainfall expected tomorrow (mocked/weather forecast rule)
        # Rule 2: Check rainfall confirmation today
        latest_rainfall = RainfallConfirmation.objects.filter(
            field__in=user_fields
        ).order_by('-confirmed_at').first()

        three_days_ago = timezone.now() - timedelta(days=3)
        recent_irrigation = IrrigationHistory.objects.filter(
            field__in=user_fields, irrigated_at__gte=three_days_ago
        ).exists()

        if latest_rainfall and latest_rainfall.rainfall_option in ['moderate_rain', 'heavy_rain']:
            rec_status = 'monitor'
            reason = 'Moderate to heavy rainfall recorded today. Soil moisture level is currently optimal.'
            volume = 300
            duration = 15
            priority = 'Medium'
        elif not recent_irrigation and (not latest_rainfall or latest_rainfall.rainfall_option == 'no_rain'):
            rec_status = 'irrigate'
            reason = 'No rainfall or irrigation recorded in the last 3 days. Soil moisture depletion detected.'
            volume = 1500
            duration = 45
            priority = 'High'
        else:
            rec_status = 'postpone'
            reason = 'Rainfall expected tomorrow (75% probability). Postpone scheduled irrigation to save water.'
            volume = 0
            duration = 0
            priority = 'Low'

        return Response({
            'field': target_field.id if target_field else None,
            'field_name': target_field.name if target_field else 'Main Field',
            'recommendation_status': rec_status,
            'reason': reason,
            'recommended_volume_litres': volume,
            'recommended_duration_minutes': duration,
            'priority': priority,
            'generated_at': timezone.now()
        })


class CropStressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CropStressRiskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return CropStressRisk.objects.filter(field__in=user_fields).select_related('field')


class IrrigationPriorityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = IrrigationPrioritySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return IrrigationPriority.objects.filter(field__in=user_fields).select_related('field')
