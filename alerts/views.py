from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert
from .serializers import AlertSerializer
from farms.models import Farm, Field


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        qs = Alert.objects.filter(field__in=user_fields).select_related('field')

        # Auto-create sample active alerts if none exist
        if not qs.exists() and user_fields.exists():
            field = user_fields.first()
            Alert.objects.create(
                field=field,
                alert_type=Alert.AlertType.WEATHER,
                severity=Alert.Severity.HIGH,
                title="Rain expected tomorrow",
                message="Weather forecast predicts 75% chance of precipitation tomorrow. Consider postponing scheduled irrigation."
            )
            Alert.objects.create(
                field=field,
                alert_type=Alert.AlertType.IRRIGATION,
                severity=Alert.Severity.MEDIUM,
                title="No irrigation for several days",
                message="Field 1 has not received irrigation in the last 3 days."
            )
            Alert.objects.create(
                field=field,
                alert_type=Alert.AlertType.SYSTEM,
                severity=Alert.Severity.LOW,
                title="New irrigation recommendation",
                message="New rule-based recommendation generated: Postpone Irrigation."
            )
            qs = Alert.objects.filter(field__in=user_fields).select_related('field')

        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)

        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            qs = qs.filter(alert_type=alert_type)

        return qs

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        """Get total count of unresolved alerts."""
        qs = self.get_queryset()
        count = qs.filter(is_resolved=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['patch', 'post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """Mark alert as resolved."""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response(self.get_serializer(alert).data)
