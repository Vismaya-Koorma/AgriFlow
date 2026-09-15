from django.db import models
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.models import User
from .models import Complaint, ComplaintUpdate
from .serializers import ComplaintSerializer, ComplaintUpdateSerializer


def send_maintenance_alert(recipient_user, title, message, farm=None, field=None, severity='medium', complaint=None):
    if not recipient_user:
        return
    try:
        from alerts.models import Alert
        is_resolved = False
        status = Alert.Status.PENDING
        if complaint and complaint.status == Complaint.Status.COMPLETED:
            is_resolved = True
            status = Alert.Status.RESOLVED

        Alert.objects.create(
            user=recipient_user,
            farm=farm,
            field=field,
            complaint=complaint,
            alert_type='system',
            severity=severity,
            title=title,
            message=message,
            is_resolved=is_resolved,
            status=status
        )
    except Exception:
        pass


class ComplaintViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Maintenance Complaints with strict role-based isolation:
    - Farmer sees only complaints submitted by themselves.
    - Maintenance Worker sees complaints assigned to them (or unassigned).
    - Supervisors/Managers/Admins see all complaints.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ComplaintSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.FARMER:
            return Complaint.objects.filter(submitted_by=user).select_related(
                'submitted_by', 'assigned_to', 'farm', 'field'
            ).prefetch_related('updates')
        elif user.role == User.Role.MAINTENANCE:
            return Complaint.objects.filter(
                models.Q(assigned_to=user) | models.Q(assigned_to__isnull=True)
            ).select_related(
                'submitted_by', 'assigned_to', 'farm', 'field'
            ).prefetch_related('updates')
        else:
            return Complaint.objects.all().select_related(
                'submitted_by', 'assigned_to', 'farm', 'field'
            ).prefetch_related('updates')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Auto assign assigned_to to a maintenance worker if not provided
        assigned_to = serializer.validated_data.get('assigned_to')
        if not assigned_to:
            assigned_to = User.objects.filter(role=User.Role.MAINTENANCE).first()

        instance = serializer.save(submitted_by=user, assigned_to=assigned_to)

        # Create initial ComplaintUpdate
        ComplaintUpdate.objects.create(
            complaint=instance,
            updated_by=user,
            progress=0,
            message=f"Complaint created by {user.full_name or user.username}. Initial status: Pending.",
            status_changed_to=instance.status
        )

        # Trigger notification to assigned maintenance worker
        field_str = instance.field.name if instance.field else "Field"
        send_maintenance_alert(
            recipient_user=assigned_to,
            title="New Maintenance Complaint",
            message=f"A new {instance.priority.upper()} priority maintenance complaint ({instance.complaint_id}) for '{field_str}' has been submitted.",
            farm=instance.farm,
            field=instance.field,
            severity='high' if instance.priority in ['high', 'urgent'] else 'medium',
            complaint=instance
        )

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Worker accepts assigned complaint."""
        complaint = self.get_object()
        complaint.status = Complaint.Status.ACCEPTED
        if not complaint.assigned_to:
            complaint.assigned_to = request.user
        complaint.save()

        ComplaintUpdate.objects.create(
            complaint=complaint,
            updated_by=request.user,
            progress=complaint.progress,
            message=f"Maintenance complaint accepted by {request.user.full_name or request.user.username}.",
            status_changed_to=Complaint.Status.ACCEPTED
        )

        # Notify Farmer
        field_str = complaint.field.name if complaint.field else "Field"
        send_maintenance_alert(
            recipient_user=complaint.submitted_by,
            title="Maintenance Complaint Accepted",
            message=f"Your maintenance complaint {complaint.complaint_id} for '{field_str}' has been accepted by maintenance worker {request.user.full_name or request.user.username}.",
            farm=complaint.farm,
            field=complaint.field,
            severity='info'
        )

        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=['post'], url_path='update_progress')
    def update_progress(self, request, pk=None):
        """Worker updates progress percentage and notes."""
        complaint = self.get_object()
        progress_val = request.data.get('progress', complaint.progress)
        try:
            progress_val = int(progress_val)
        except (ValueError, TypeError):
            progress_val = complaint.progress

        new_status = request.data.get('status', complaint.status)
        note = request.data.get('message', request.data.get('notes', ''))

        old_status = complaint.status
        complaint.progress = max(0, min(100, progress_val))

        explicit_status = request.data.get('status')
        if explicit_status and explicit_status in Complaint.Status.values:
            complaint.status = explicit_status
        elif complaint.progress > 0 and complaint.progress < 100 and complaint.status in [Complaint.Status.PENDING, Complaint.Status.ACCEPTED]:
            complaint.status = Complaint.Status.IN_PROGRESS
        elif complaint.progress == 100:
            complaint.status = Complaint.Status.COMPLETED

        if complaint.status == Complaint.Status.COMPLETED and not complaint.completed_at:
            complaint.completed_at = timezone.now()

        complaint.save()

        if complaint.status == Complaint.Status.COMPLETED:
            from alerts.services import resolve_maintenance_notification
            resolve_maintenance_notification(complaint)

        ComplaintUpdate.objects.create(
            complaint=complaint,
            updated_by=request.user,
            progress=complaint.progress,
            message=note or f"Progress updated to {complaint.progress}%. Status: {complaint.get_status_display()}.",
            status_changed_to=complaint.status if complaint.status != old_status else None
        )

        # Notify Farmer
        field_str = complaint.field.name if complaint.field else "Field"
        alert_title = "Maintenance Work Started" if complaint.status == Complaint.Status.IN_PROGRESS and old_status != Complaint.Status.IN_PROGRESS else "Maintenance Progress Updated"
        send_maintenance_alert(
            recipient_user=complaint.submitted_by,
            title=alert_title,
            message=f"Maintenance complaint {complaint.complaint_id} for '{field_str}' updated to {complaint.progress}%. Note: {note or 'Progress update submitted.'}",
            farm=complaint.farm,
            field=complaint.field,
            severity='info',
            complaint=complaint
        )

        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """Worker marks task as completed with notes and completion image."""
        complaint = self.get_object()
        notes = request.data.get('completion_notes', request.data.get('message', 'Maintenance work completed.'))
        completion_img = request.FILES.get('completion_image')

        complaint.progress = 100
        complaint.status = Complaint.Status.COMPLETED
        complaint.completion_notes = notes
        complaint.completed_at = timezone.now()
        if completion_img:
            complaint.completion_image = completion_img

        complaint.save()

        from alerts.services import resolve_maintenance_notification
        resolve_maintenance_notification(complaint)

        ComplaintUpdate.objects.create(
            complaint=complaint,
            updated_by=request.user,
            progress=100,
            message=f"Task Completed. Notes: {notes}",
            status_changed_to=Complaint.Status.COMPLETED
        )

        # Notify Farmer
        field_str = complaint.field.name if complaint.field else "Field"
        send_maintenance_alert(
            recipient_user=complaint.submitted_by,
            title="Maintenance Completed",
            message=f"Your maintenance complaint {complaint.complaint_id} for '{field_str}' has been completed.",
            farm=complaint.farm,
            field=complaint.field,
            severity='medium',
            complaint=complaint
        )

        return Response(ComplaintSerializer(complaint).data)


class ComplaintUpdateViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly viewset for timeline updates."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComplaintUpdateSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.FARMER:
            return ComplaintUpdate.objects.filter(complaint__submitted_by=user)
        elif user.role == User.Role.MAINTENANCE:
            return ComplaintUpdate.objects.filter(
                models.Q(complaint__assigned_to=user) | models.Q(complaint__assigned_to__isnull=True)
            )
        return ComplaintUpdate.objects.all()

