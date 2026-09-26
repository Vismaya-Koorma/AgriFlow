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
    """CRUD for fields scoped to user / supervisors."""
    serializer_class = FieldSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['supervisor', 'manager', 'admin'] or user.is_superuser:
            qs = Field.objects.all().select_related('farm', 'crop_type', 'soil_type')
        else:
            user_farms = Farm.objects.filter(user=user)
            qs = Field.objects.filter(farm__in=user_farms).select_related('farm', 'crop_type', 'soil_type')

        farm_id = self.request.query_params.get('farm')
        if farm_id:
            qs = qs.filter(farm__id=farm_id)

        verif_status = self.request.query_params.get('verification_status')
        if verif_status:
            qs = qs.filter(verification_status=verif_status)

        return qs

    def perform_create(self, serializer):
        # Ensure field belongs to a farm owned by the user
        farm = serializer.validated_data.get('farm')
        if farm and farm.user != self.request.user and self.request.user.role not in ['manager', 'admin', 'supervisor']:
            raise PermissionDenied("You don't own this farm.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """
        Supervisor / Manager / Admin action to verify or reject a field ground truth.
        """
        user = request.user
        if not user or not user.is_authenticated or (user.role not in ['supervisor', 'manager', 'admin'] and not user.is_superuser):
            return Response({'error': 'Only Supervisors, Managers, or Admins can verify fields.'}, status=status.HTTP_403_FORBIDDEN)

        field_obj = self.get_object()
        status_param = request.data.get('status')
        if status_param not in ['verified', 'rejected']:
            return Response({'error': "Status must be either 'verified' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        field_obj.verification_status = status_param
        field_obj.verified_by = user
        field_obj.save()

        serializer = self.get_serializer(field_obj)
        return Response({
            'message': f"Field '{field_obj.name}' verification status updated to '{status_param}'.",
            'field': serializer.data
        }, status=status.HTTP_200_OK)
