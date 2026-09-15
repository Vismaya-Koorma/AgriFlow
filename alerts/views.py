from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from .models import Alert
from .serializers import AlertSerializer
from farms.models import Farm, Field


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _seed_sample_alerts_for_user(self, user):
        """Helper to seed initial active alerts for a user based on their role."""
        if user.role == 'maintenance' or user.username == 'maintenance':
            Alert.objects.get_or_create(
                user=user,
                title="New Maintenance Task Assigned",
                defaults={
                    'alert_type': Alert.AlertType.SYSTEM,
                    'severity': Alert.Severity.HIGH,
                    'message': "Complaint CMP-0001 (Water Leakage) for field inspection requires attention."
                }
            )
        elif user.role in ['manager', 'supervisor']:
            Alert.objects.get_or_create(
                user=user,
                title="Water Reservoir Allocation Notice",
                defaults={
                    'alert_type': Alert.AlertType.SYSTEM,
                    'severity': Alert.Severity.MEDIUM,
                    'message': "District reservoir capacity report updated. Review allocation requests."
                }
            )
        elif user.role == 'admin':
            Alert.objects.get_or_create(
                user=user,
                title="System Operational Update",
                defaults={
                    'alert_type': Alert.AlertType.SYSTEM,
                    'severity': Alert.Severity.LOW,
                    'message': "AgriFlow system backup completed. All APIs active."
                }
            )
        else: # farmer
            farm = Farm.objects.filter(user=user).first()
            field = Field.objects.filter(farm=farm).first() if farm else None
            Alert.objects.get_or_create(
                user=user,
                title="Irrigation Schedule Recommendation",
                defaults={
                    'farm': farm,
                    'field': field,
                    'alert_type': Alert.AlertType.IRRIGATION,
                    'severity': Alert.Severity.HIGH,
                    'message': f"Recommended 15mm irrigation for {field.name if field else 'your field'} based on soil moisture trends."
                }
            )

    def get_queryset(self):
        user = self.request.user

        # Auto-synchronize notifications for completed maintenance complaints
        from .services import sync_maintenance_notifications
        sync_maintenance_notifications()

        # Auto-associate any legacy unassigned alerts belonging to user's farm/field
        unassigned = Alert.objects.filter(user__isnull=True)
        if user.role == 'farmer':
            user_farms = Farm.objects.filter(user=user)
            unassigned.filter(models.Q(farm__in=user_farms) | models.Q(field__farm__in=user_farms)).update(user=user)
        elif user.role == 'maintenance':
            unassigned.filter(alert_type=Alert.AlertType.SYSTEM, title__icontains='Maintenance Task').update(user=user)

        qs = Alert.objects.filter(user=user).select_related('field', 'farm', 'user')

        # If user has no alerts in database, seed initial starter notification for them
        if not qs.exists():
            self._seed_sample_alerts_for_user(user)
            qs = Alert.objects.filter(user=user).select_related('field', 'farm', 'user')

        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)

        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            qs = qs.filter(alert_type=alert_type)

        is_resolved = self.request.query_params.get('is_resolved')
        if is_resolved is not None:
            if is_resolved.lower() in ['true', '1']:
                qs = qs.filter(is_resolved=True)
            elif is_resolved.lower() in ['false', '0']:
                qs = qs.filter(is_resolved=False)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        """Get total count of unresolved alerts for logged-in user."""
        qs = self.get_queryset()
        count = qs.filter(is_resolved=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['patch', 'post'], url_path='read')
    def mark_read(self, request, pk=None):
        """Mark alert as READ (opening/viewing does NOT resolve the alert)."""
        alert = self.get_object()
        if alert.user and alert.user != request.user:
            return Response({'detail': 'Not authorized to modify this alert.'}, status=status.HTTP_403_FORBIDDEN)
        alert.is_read = True
        alert.save()
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=['patch', 'post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """Mark alert as resolved (strictly authorized per user)."""
        alert = self.get_object()
        if alert.user and alert.user != request.user:
            return Response({'detail': 'Not authorized to resolve this alert.'}, status=status.HTTP_403_FORBIDDEN)
        alert.is_resolved = True
        alert.status = Alert.Status.RESOLVED
        alert.is_read = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response(self.get_serializer(alert).data)


