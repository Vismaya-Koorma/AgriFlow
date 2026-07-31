from rest_framework import viewsets, permissions
from .models import Alert
from .serializers import AlertSerializer
from farms.models import Farm, Field


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return Alert.objects.filter(field__in=user_fields).select_related('field')
