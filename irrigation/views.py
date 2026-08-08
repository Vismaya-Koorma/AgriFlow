from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import IrrigationHistory, RainfallConfirmation
from .serializers import IrrigationHistorySerializer, RainfallConfirmationSerializer
from farms.models import Farm, Field


class IrrigationHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = IrrigationHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        qs = IrrigationHistory.objects.filter(field__in=user_fields).select_related('field')

        field_id = self.request.query_params.get('field')
        if field_id:
            qs = qs.filter(field__id=field_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(field__name__icontains=search) |
                Q(method__icontains=search) |
                Q(water_source__icontains=search) |
                Q(notes__icontains=search)
            )

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(irrigated_at__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(irrigated_at__date__lte=end_date)

        return qs

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        if field and field.farm.user != self.request.user:
            raise PermissionDenied("You don't own this field.")
        serializer.save(created_by=self.request.user)


class RainfallConfirmationViewSet(viewsets.ModelViewSet):
    serializer_class = RainfallConfirmationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return RainfallConfirmation.objects.filter(field__in=user_fields).select_related('field')

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        if field and field.farm.user != self.request.user:
            raise PermissionDenied("You don't own this field.")

        # Assign estimated mm based on option if not specified
        option = serializer.validated_data.get('rainfall_option', 'no_rain')
        rainfall_map = {'no_rain': 0.0, 'light_rain': 5.0, 'moderate_rain': 15.0, 'heavy_rain': 35.0}
        rainfall_mm = serializer.validated_data.get('rainfall_mm') or rainfall_map.get(option, 0.0)

        serializer.save(confirmed_by=self.request.user, rainfall_mm=rainfall_mm)

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        latest_record = self.get_queryset().first()
        if latest_record:
            serializer = self.get_serializer(latest_record)
            return Response(serializer.data)
        return Response({'message': 'No rainfall confirmation found.'}, status=status.HTTP_200_OK)
