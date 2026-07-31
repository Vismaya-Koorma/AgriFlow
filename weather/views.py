from rest_framework import viewsets, permissions
from .models import WeatherData
from .serializers import WeatherDataSerializer
from farms.models import Farm, Field


class WeatherDataViewSet(viewsets.ModelViewSet):
    serializer_class = WeatherDataSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        qs = WeatherData.objects.filter(field__in=user_fields).select_related('field')
        field_id = self.request.query_params.get('field')
        if field_id:
            qs = qs.filter(field__id=field_id)
        return qs
