from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Farm, Field
from .serializers import FarmSerializer, FieldSerializer


class FarmViewSet(viewsets.ModelViewSet):
    """CRUD for farms scoped to the logged-in user."""
    serializer_class = FarmSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Farm.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FieldViewSet(viewsets.ModelViewSet):
    """CRUD for fields scoped to the logged-in user's farms."""
    serializer_class = FieldSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        qs = Field.objects.filter(farm__in=user_farms).select_related('farm', 'crop_type', 'soil_type')
        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm__id=farm_id)
        return qs

    def perform_create(self, serializer):
        # Ensure field belongs to a farm owned by the user
        farm = serializer.validated_data.get('farm')
        if farm and farm.user != self.request.user:
            raise PermissionDenied("You don't own this farm.")
        serializer.save()
