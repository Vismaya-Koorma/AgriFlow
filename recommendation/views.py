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


class RecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = IrrigationRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return IrrigationRecommendation.objects.filter(field__in=user_fields).select_related('field')


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
