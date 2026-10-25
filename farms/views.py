from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from .models import (
    Farm, Field, FieldInspectionCriterion, FieldInspection,
    FieldCriterionResult, FieldCorrectiveAction, FieldVerificationHistory
)
from .serializers import (
    FarmSerializer, FieldSerializer, FieldInspectionCriterionSerializer,
    FieldInspectionSerializer, FieldCriterionResultSerializer,
    FieldCorrectiveActionSerializer, FieldVerificationHistorySerializer
)
from .services import (
    is_supervisor_assigned_to_field, get_applicable_criteria_for_field,
    submit_field_inspection, reject_field_with_reason, schedule_field_reinspection
)


class FarmViewSet(viewsets.ModelViewSet):
    """CRUD for farms scoped to the logged-in user."""
    serializer_class = FarmSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager'] or user.is_superuser:
            return Farm.objects.all().select_related('user')
        return Farm.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FieldViewSet(viewsets.ModelViewSet):
    """CRUD for fields scoped to user / supervisors."""
    serializer_class = FieldSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['supervisor', 'manager', 'admin'] or user.is_superuser:
            qs = Field.objects.all().select_related('farm', 'farm__user', 'crop_type', 'soil_type', 'verified_by')
        else:
            user_farms = Farm.objects.filter(user=user)
            qs = Field.objects.filter(farm__in=user_farms).select_related('farm', 'farm__user', 'crop_type', 'soil_type', 'verified_by')

        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm__id=farm_id)

        verif_status = self.request.query_params.get('verification_status')
        if verif_status:
            qs = qs.filter(verification_status=verif_status)

        return qs

    def perform_create(self, serializer):
        farm = serializer.validated_data.get('farm')
        if farm and farm.user != self.request.user and self.request.user.role not in ['manager', 'admin', 'supervisor']:
            raise PermissionDenied("You don't own this farm.")
        serializer.save()

    @action(detail=True, methods=['get'], url_path='criteria')
    def get_criteria(self, request, pk=None):
        """
        Returns active inspection criteria applicable to this field's crop type and stage.
        """
        field_obj = self.get_object()
        criteria = get_applicable_criteria_for_field(field_obj)
        serializer = FieldInspectionCriterionSerializer(criteria, many=True)
        return Response({
            'field_id': field_obj.id,
            'field_name': field_obj.name,
            'farm_name': field_obj.farm.name,
            'crop_type': field_obj.crop_type.name if field_obj.crop_type else None,
            'crop_variety': field_obj.crop_variety.variety_name if field_obj.crop_variety else None,
            'soil_type': field_obj.soil_type.name if field_obj.soil_type else None,
            'crop_stage': field_obj.crop_stage,
            'criteria': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='inspect')
    def inspect(self, request, pk=None):
        """
        Submits completed inspection checklist.
        Validates criteria, calculates decision, and persists inspection results.
        """
        user = request.user
        field_obj = self.get_object()

        # Check authorization
        if not is_supervisor_assigned_to_field(user, field_obj):
            return Response(
                {'error': 'You are not authorized to verify or inspect this field. Only field supervisors may perform inspections.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            inspection, decision = submit_field_inspection(field_obj, user, request.data)
            inspection_serializer = FieldInspectionSerializer(inspection)
            field_obj.refresh_from_db()
            field_serializer = self.get_serializer(field_obj)
            return Response({
                'message': f"Field inspection completed. Automatic calculated decision: {decision.upper()}.",
                'decision': decision,
                'inspection': inspection_serializer.data,
                'field': field_serializer.data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_action(self, request, pk=None):
        """
        Explicit rejection action with mandatory rejection reason and evidence.
        """
        user = request.user
        field_obj = self.get_object()

        if not is_supervisor_assigned_to_field(user, field_obj):
            return Response(
                {'error': 'You are not authorized to reject this field. Only field supervisors may reject fields.'},
                status=status.HTTP_403_FORBIDDEN
            )

        rejection_reason = request.data.get('rejection_reason')
        if not rejection_reason or not str(rejection_reason).strip():
            return Response({'error': 'A detailed rejection reason is mandatory.'}, status=status.HTTP_400_BAD_REQUEST)

        failed_criteria_data = request.data.get('failed_criteria') or []
        reinspection_date = request.data.get('reinspection_scheduled_date')

        try:
            inspection = reject_field_with_reason(
                field_obj, user, rejection_reason,
                failed_criteria_data=failed_criteria_data,
                reinspection_date=reinspection_date
            )
            field_obj.refresh_from_db()
            field_serializer = self.get_serializer(field_obj)
            inspection_serializer = FieldInspectionSerializer(inspection)
            return Response({
                'message': f"Field '{field_obj.name}' has been REJECTED. The farmer has been notified.",
                'decision': 'rejected',
                'field': field_serializer.data,
                'inspection': inspection_serializer.data
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='inspections')
    def get_inspections(self, request, pk=None):
        """
        Retrieves all inspection records and history for this field.
        Farmers can only access inspections for their own fields.
        """
        user = request.user
        field_obj = self.get_object()

        # Farmer data isolation check
        if user.role == 'farmer' and field_obj.farm.user != user:
            return Response({'error': 'You cannot access inspection records for other farmers.'}, status=status.HTTP_403_FORBIDDEN)

        inspections = field_obj.ground_truth_inspections.all().prefetch_related(
            'criterion_results', 'criterion_results__criterion', 'corrective_actions'
        )
        serializer = FieldInspectionSerializer(inspections, many=True)
        return Response({
            'field_id': field_obj.id,
            'field_name': field_obj.name,
            'farm_name': field_obj.farm.name,
            'current_status': field_obj.verification_status,
            'reinspection_scheduled_date': field_obj.reinspection_scheduled_date,
            'inspections': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='latest-inspection')
    def latest_inspection(self, request, pk=None):
        """
        Returns the latest inspection report for this field.
        """
        user = request.user
        field_obj = self.get_object()

        if user.role == 'farmer' and field_obj.farm.user != user:
            return Response({'error': 'You cannot access inspection records for other farmers.'}, status=status.HTTP_403_FORBIDDEN)

        latest = field_obj.ground_truth_inspections.first()
        if not latest:
            return Response({
                'field_id': field_obj.id,
                'field_name': field_obj.name,
                'current_status': field_obj.verification_status,
                'latest_inspection': None
            })

        serializer = FieldInspectionSerializer(latest)
        return Response({
            'field_id': field_obj.id,
            'field_name': field_obj.name,
            'current_status': field_obj.verification_status,
            'latest_inspection': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='schedule-reinspection')
    def schedule_reinspection(self, request, pk=None):
        """
        Schedules a reinspection date for an inspected field.
        """
        user = request.user
        field_obj = self.get_object()

        if not is_supervisor_assigned_to_field(user, field_obj):
            return Response({'error': 'You are not authorized to schedule reinspections for this field.'}, status=status.HTTP_403_FORBIDDEN)

        reinspection_date = request.data.get('reinspection_date') or request.data.get('reinspection_scheduled_date')
        if not reinspection_date:
            return Response({'error': 'reinspection_date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('notes', '')
        try:
            schedule_field_reinspection(field_obj, user, reinspection_date, notes)
            field_obj.refresh_from_db()
            return Response({
                'message': f"Reinspection scheduled for {reinspection_date}.",
                'field': self.get_serializer(field_obj).data
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """
        Enforces criteria-based verification.
        Rejects attempts to submit VERIFIED without a valid inspection checklist.
        """
        user = request.user
        field_obj = self.get_object()

        if not is_supervisor_assigned_to_field(user, field_obj):
            return Response({'error': 'Only field supervisors can verify fields.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if full checklist was provided
        criterion_results = request.data.get('criterion_results')
        if criterion_results:
            try:
                inspection, decision = submit_field_inspection(field_obj, user, request.data)
                field_obj.refresh_from_db()
                return Response({
                    'message': f"Field verification completed. Calculated decision: {decision.upper()}.",
                    'decision': decision,
                    'field': self.get_serializer(field_obj).data
                }, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

        status_param = request.data.get('status')
        if status_param == 'verified':
            return Response({
                'error': 'Field cannot be verified directly without a valid inspection checklist. Please complete and submit the criteria checklist.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if status_param == 'rejected':
            rejection_reason = request.data.get('rejection_reason')
            if not rejection_reason or not str(rejection_reason).strip():
                return Response({
                    'error': 'A detailed rejection reason is mandatory when rejecting a field.'
                }, status=status.HTTP_400_BAD_REQUEST)
            try:
                inspection = reject_field_with_reason(field_obj, user, rejection_reason, failed_criteria_data=request.data.get('failed_criteria'))
                field_obj.refresh_from_db()
                return Response({
                    'message': f"Field '{field_obj.name}' rejected.",
                    'decision': 'rejected',
                    'field': self.get_serializer(field_obj).data
                }, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'error': "Invalid request. A completed inspection checklist or documented rejection reason is required."
        }, status=status.HTTP_400_BAD_REQUEST)


class FieldInspectionCriterionViewSet(viewsets.ModelViewSet):
    """
    CRUD for inspection criteria.
    Read: Authenticated users.
    Create/Update/Delete: Admin users only.
    """
    serializer_class = FieldInspectionCriterionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = FieldInspectionCriterion.objects.all().order_by('order', 'id')
        active_only = self.request.query_params.get('active')
        if active_only in ['true', '1']:
            qs = qs.filter(is_active=True)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.role == 'admin'):
            raise PermissionDenied("Only administrators can create inspection criteria.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.role == 'admin'):
            raise PermissionDenied("Only administrators can update inspection criteria.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or user.role == 'admin'):
            raise PermissionDenied("Only administrators can delete inspection criteria.")
        instance.delete()


class FieldCorrectiveActionViewSet(viewsets.ModelViewSet):
    """
    Management of corrective actions.
    Farmers view their own actions and can update progress/resolution.
    Supervisors and admins can view and verify.
    """
    serializer_class = FieldCorrectiveActionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'farmer':
            qs = FieldCorrectiveAction.objects.filter(farmer=user)
        else:
            qs = FieldCorrectiveAction.objects.all()

        field_id = self.request.query_params.get('field')
        if field_id:
            qs = qs.filter(field_id=field_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs.select_related('field', 'field__farm', 'inspection')

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Farmer can update resolution status & notes
        if user.role == 'farmer' and instance.farmer != user:
            raise PermissionDenied("You can only update corrective actions for your own fields.")

        new_status = request.data.get('status')
        if new_status and new_status not in [FieldCorrectiveAction.Status.PENDING, FieldCorrectiveAction.Status.IN_PROGRESS, FieldCorrectiveAction.Status.RESOLVED]:
            return Response({'error': "Invalid status. Must be 'pending', 'in_progress', or 'resolved'."}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == FieldCorrectiveAction.Status.RESOLVED:
            instance.resolved_at = timezone.now()

        instance.resolution_notes = request.data.get('resolution_notes', instance.resolution_notes)
        if new_status:
            instance.status = new_status
        instance.save()

        return Response(self.get_serializer(instance).data)
