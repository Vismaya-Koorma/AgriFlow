from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q, Sum, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from datetime import timedelta
import logging

from .models import (
    IrrigationHistory, RainfallConfirmation,
    WaterSource, WaterLevelHistory, WaterAllocationRequest, WaterAllocation, WaterUsage
)
from .serializers import (
    IrrigationHistorySerializer, RainfallConfirmationSerializer,
    WaterSourceSerializer, WaterLevelHistorySerializer,
    WaterAllocationRequestSerializer, WaterAllocationSerializer, WaterUsageSerializer
)
from farms.models import Farm, Field
from alerts.models import Alert
from accounts.models import User

logger = logging.getLogger(__name__)


# ─── RBAC PERMISSION CLASS ──────────────────────────────────────────────────

class IsWaterManagerOrAdmin(permissions.BasePermission):
    """
    Custom permission allowing access only to authenticated Water Resource Managers or Administrators.
    Returns 403 Forbidden for Farmers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Allow if role is manager or admin, or user is superuser
        return request.user.role in ['manager', 'admin'] or request.user.is_superuser


# ─── EXISTING FARMER VIEWSETS ───────────────────────────────────────────────

class IrrigationHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = IrrigationHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin'] or user.is_superuser:
            qs = IrrigationHistory.objects.all().select_related('field')
        else:
            user_farms = Farm.objects.filter(user=user)
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
        return qs

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        if field and field.farm.user != self.request.user and self.request.user.role not in ['manager', 'admin']:
            raise PermissionDenied("You don't own this field.")
        serializer.save(created_by=self.request.user)


class RainfallConfirmationViewSet(viewsets.ModelViewSet):
    serializer_class = RainfallConfirmationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin'] or user.is_superuser:
            return RainfallConfirmation.objects.all().select_related('field')
        user_farms = Farm.objects.filter(user=user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return RainfallConfirmation.objects.filter(field__in=user_fields).select_related('field')

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        if field and field.farm.user != self.request.user and self.request.user.role not in ['manager', 'admin']:
            raise PermissionDenied("You don't own this field.")

        option = serializer.validated_data.get('rainfall_option', 'no_rain')
        rainfall_map = {'no_rain': 0.0, 'light_rain': 5.0, 'moderate_rain': 15.0, 'heavy_rain': 35.0}
        rainfall_mm = serializer.validated_data.get('rainfall_mm') or rainfall_map.get(option, 0.0)

        serializer.save(confirmed_by=self.request.user, rainfall_mm=rainfall_mm)


# ─── WATER SOURCE VIEWSET ────────────────────────────────────────────────────

class WaterSourceViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Regional Water Sources.
    Protected by IsWaterManagerOrAdmin.
    """
    queryset = WaterSource.objects.all()
    serializer_class = WaterSourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsWaterManagerOrAdmin]

    def get_queryset(self):
        qs = WaterSource.objects.all()
        location = self.request.query_params.get('location')
        if location:
            qs = qs.filter(location__icontains=location)

        source_type = self.request.query_params.get('source_type')
        if source_type:
            qs = qs.filter(source_type=source_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(location__icontains=search))

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    @action(detail=True, methods=['post'], url_path='update-level')
    def update_level(self, request, pk=None):
        """Update current water level, log history, and generate alerts if critical."""
        source = self.get_object()
        new_level = request.data.get('new_level_liters')
        reason = request.data.get('reason', '')

        if new_level is None:
            return Response({'error': 'new_level_liters is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_level_dec = float(new_level)
            if new_level_dec < 0:
                return Response({'error': 'Water level cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid number format for new_level_liters.'}, status=status.HTTP_400_BAD_REQUEST)

        previous_level = float(source.current_level_liters)
        change_amount = new_level_dec - previous_level

        with transaction.atomic():
            source.current_level_liters = new_level_dec
            source.save()

            # Record Level History
            history = WaterLevelHistory.objects.create(
                water_source=source,
                previous_level_liters=previous_level,
                new_level_liters=new_level_dec,
                change_amount_liters=change_amount,
                reason=reason,
                updated_by=request.user
            )

            # Check if source dropped to CRITICAL status
            if source.status == WaterSource.Status.CRITICAL:
                # Find a sample field in this region to attach systemic resource alert
                sample_field = Field.objects.filter(farm__location__icontains=source.location).first() or Field.objects.first()
                if sample_field:
                    Alert.objects.create(
                        field=sample_field,
                        alert_type=Alert.AlertType.SYSTEM,
                        severity=Alert.Severity.CRITICAL,
                        title=f"Water Source Critical: {source.name}",
                        message=f"{source.name} in {source.location} has reached critical capacity ({source.percentage_level}%). Immediate water rationing required.",
                        is_resolved=False
                    )

        serializer = self.get_serializer(source)
        return Response({
            'message': f"Water level updated for '{source.name}'.",
            'source': serializer.data,
            'history_id': history.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        source = self.get_object()
        history_qs = WaterLevelHistory.objects.filter(water_source=source).order_by('-recorded_at')
        serializer = WaterLevelHistorySerializer(history_qs, many=True)
        return Response(serializer.data)


# ─── WATER ALLOCATION REQUEST VIEWSET ───────────────────────────────────────

class WaterAllocationRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Water Allocation Requests.
    Farmers can view their requests or submit requests.
    Managers/Admins can approve or reject requests.
    """
    queryset = WaterAllocationRequest.objects.all()
    serializer_class = WaterAllocationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin'] or user.is_superuser:
            qs = WaterAllocationRequest.objects.all().select_related('farmer', 'farm', 'field')
        else:
            qs = WaterAllocationRequest.objects.filter(farmer=user).select_related('farmer', 'farm', 'field')

        req_status = self.request.query_params.get('status')
        if req_status:
            qs = qs.filter(status=req_status)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(farm__name__icontains=search) |
                Q(field__name__icontains=search) |
                Q(farmer__full_name__icontains=search) |
                Q(farmer__username__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        field = serializer.validated_data.get('field')
        farm = serializer.validated_data.get('farm') or getattr(field, 'farm', None)

        if field and field.farm.user != self.request.user and self.request.user.role not in ['manager', 'admin']:
            raise PermissionDenied("You can only request allocations for your own fields.")

        serializer.save(farmer=self.request.user, farm=farm)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Atomically approve an allocation request.
        Locks WaterSource, checks available water, creates WaterAllocation, updates status, and notifies farmer.
        """
        if request.user.role not in ['manager', 'admin'] and not request.user.is_superuser:
            return Response({'error': 'Only Water Resource Managers or Admins can approve allocations.'}, status=status.HTTP_403_FORBIDDEN)

        alloc_req = self.get_object()

        if alloc_req.status in [WaterAllocationRequest.RequestStatus.APPROVED, WaterAllocationRequest.RequestStatus.COMPLETED]:
            return Response({'error': 'This allocation request has already been approved.'}, status=status.HTTP_400_BAD_REQUEST)

        water_source_id = request.data.get('water_source_id')
        approved_amount = request.data.get('approved_amount_liters') or alloc_req.requested_amount_liters

        if not water_source_id:
            return Response({'error': 'water_source_id is required for approval.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            approved_amount_dec = float(approved_amount)
            if approved_amount_dec <= 0:
                return Response({'error': 'Approved amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid number format for approved_amount_liters.'}, status=status.HTTP_400_BAD_REQUEST)

        # Atomic Transaction with Row Locking
        with transaction.atomic():
            try:
                source = WaterSource.objects.select_for_update().get(id=water_source_id, is_active=True)
            except WaterSource.DoesNotExist:
                return Response({'error': 'Water source not found or inactive.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check Concurrency & Available Water
            if approved_amount_dec > source.available_liters:
                return Response({
                    'error': f"Insufficient available water in source '{source.name}'. Requested: {approved_amount_dec:,}L, Available: {source.available_liters:,}L."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Reserve Water Amount
            source.reserved_liters = float(source.reserved_liters) + approved_amount_dec
            source.save()

            # Determine Status: APPROVED vs PARTIALLY APPROVED
            requested_dec = float(alloc_req.requested_amount_liters)
            if approved_amount_dec < requested_dec:
                new_status = WaterAllocationRequest.RequestStatus.PARTIALLY_APPROVED
            else:
                new_status = WaterAllocationRequest.RequestStatus.APPROVED

            alloc_req.status = new_status
            alloc_req.approved_amount_liters = approved_amount_dec
            alloc_req.reviewed_at = timezone.now()
            alloc_req.reviewed_by = request.user
            alloc_req.save()

            # Create WaterAllocation Record
            allocation = WaterAllocation.objects.create(
                request=alloc_req,
                water_source=source,
                farm=alloc_req.farm,
                field=alloc_req.field,
                allocated_amount_liters=approved_amount_dec,
                status=WaterAllocation.AllocationStatus.ACTIVE,
                allocated_by=request.user
            )

            # Create Alert Notification for Farmer
            Alert.objects.create(
                field=alloc_req.field,
                alert_type=Alert.AlertType.SYSTEM,
                severity=Alert.Severity.LOW if new_status == WaterAllocationRequest.RequestStatus.APPROVED else Alert.Severity.MEDIUM,
                title=f"Water Allocation {new_status.title()}",
                message=f"Your water allocation request for {alloc_req.field.name} has been {new_status.replace('_', ' ')}: {approved_amount_dec:,} Liters allocated from {source.name}.",
                is_resolved=False
            )

        return Response({
            'message': f"Allocation request #{alloc_req.id} approved successfully.",
            'allocation_id': allocation.id,
            'status': alloc_req.status,
            'approved_amount_liters': approved_amount_dec,
            'source_remaining_available': source.available_liters
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if request.user.role not in ['manager', 'admin'] and not request.user.is_superuser:
            return Response({'error': 'Only Water Resource Managers or Admins can reject allocations.'}, status=status.HTTP_403_FORBIDDEN)

        alloc_req = self.get_object()
        reason = request.data.get('reason', '').strip()

        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        alloc_req.status = WaterAllocationRequest.RequestStatus.REJECTED
        alloc_req.reason = reason
        alloc_req.reviewed_at = timezone.now()
        alloc_req.reviewed_by = request.user
        alloc_req.save()

        # Create Alert Notification for Farmer
        Alert.objects.create(
            field=alloc_req.field,
            alert_type=Alert.AlertType.SYSTEM,
            severity=Alert.Severity.MEDIUM,
            title="Water Allocation Request Rejected",
            message=f"Your water allocation request for {alloc_req.field.name} ({alloc_req.requested_amount_liters:,}L) was rejected. Reason: {reason}",
            is_resolved=False
        )

        return Response({'message': f"Allocation request #{alloc_req.id} rejected.", 'status': 'rejected'}, status=status.HTTP_200_OK)


# ─── WATER ALLOCATION VIEWSET ────────────────────────────────────────────────

class WaterAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing approved Water Allocations."""
    queryset = WaterAllocation.objects.all()
    serializer_class = WaterAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin'] or user.is_superuser:
            qs = WaterAllocation.objects.all().select_related('water_source', 'farm', 'field')
        else:
            qs = WaterAllocation.objects.filter(farm__user=user).select_related('water_source', 'farm', 'field')

        source_id = self.request.query_params.get('source')
        if source_id:
            qs = qs.filter(water_source__id=source_id)

        alloc_status = self.request.query_params.get('status')
        if alloc_status:
            qs = qs.filter(status=alloc_status)

        return qs


# ─── WATER USAGE VIEWSET ─────────────────────────────────────────────────────

class WaterUsageViewSet(viewsets.ModelViewSet):
    """ViewSet for recording actual water usage."""
    queryset = WaterUsage.objects.all()
    serializer_class = WaterUsageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin'] or user.is_superuser:
            return WaterUsage.objects.all().select_related('water_source', 'field')
        return WaterUsage.objects.filter(field__farm__user=user).select_related('water_source', 'field')

    def perform_create(self, serializer):
        allocation = serializer.validated_data.get('allocation')
        water_source = serializer.validated_data.get('water_source')
        field = serializer.validated_data.get('field')
        volume = float(serializer.validated_data.get('volume_liters'))

        with transaction.atomic():
            # Lock Water Source
            source = WaterSource.objects.select_for_update().get(id=water_source.id)
            source.current_level_liters = max(0.0, float(source.current_level_liters) - volume)
            source.reserved_liters = max(0.0, float(source.reserved_liters) - volume)
            source.save()

            if allocation:
                alloc = WaterAllocation.objects.select_for_update().get(id=allocation.id)
                alloc.used_amount_liters = float(alloc.used_amount_liters) + volume
                if alloc.used_amount_liters >= float(alloc.allocated_amount_liters):
                    alloc.status = WaterAllocation.AllocationStatus.USED
                alloc.save()

            serializer.save(recorded_by=self.request.user)


# ─── WATER MANAGER DASHBOARD EXECUTIVE VIEW ─────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsWaterManagerOrAdmin])
def water_manager_dashboard_summary(request):
    """
    Executive summary endpoint providing aggregate water resource metrics:
    1. Total Water Available
    2. Water Allocated
    3. Water Used
    4. Remaining Water
    5. Active Water Sources Count
    6. Pending Requests Count
    7. Water Level Trend & Demand vs Availability
    8. Weather Impact Summary
    """
    # 1. Active Sources
    sources = WaterSource.objects.filter(is_active=True)

    total_capacity = sum(float(s.capacity_liters) for s in sources)
    total_current = sum(float(s.current_level_liters) for s in sources)
    total_reserved = sum(float(s.reserved_liters) for s in sources)
    total_available = max(0.0, total_current - total_reserved)

    # 2. Allocations
    active_allocations = WaterAllocation.objects.filter(status=WaterAllocation.AllocationStatus.ACTIVE)
    water_allocated = sum(float(a.allocated_amount_liters) for a in active_allocations)
    water_used = sum(float(a.used_amount_liters) for a in active_allocations)
    remaining_water = max(0.0, total_available - water_allocated)

    # 3. Counts
    active_sources_count = sources.count()
    pending_requests_count = WaterAllocationRequest.objects.filter(status=WaterAllocationRequest.RequestStatus.PENDING).count()

    # 4. Regional Water Demand vs Availability
    districts = ['Pala', 'Kottayam', 'Palakkad', 'Kannur', 'Thrissur']
    demand_vs_availability = []

    for dist in districts:
        dist_sources = WaterSource.objects.filter(location__icontains=dist, is_active=True)
        dist_avail = sum(s.available_liters for s in dist_sources)
        dist_requests = WaterAllocationRequest.objects.filter(farm__location__icontains=dist)
        dist_demand = sum(float(r.requested_amount_liters) for r in dist_requests)

        shortage_status = 'Sufficient' if dist_avail >= dist_demand else 'Potential Shortage'
        demand_vs_availability.append({
            'district': dist,
            'available_liters': dist_avail,
            'demand_liters': dist_demand,
            'status': shortage_status
        })

    # 5. Resource Shortage Alerts
    critical_sources = sources.filter(status=WaterSource.Status.CRITICAL)
    resource_alerts = []

    for cs in critical_sources:
        resource_alerts.append({
            'id': cs.id,
            'title': f"Critical Level: {cs.name}",
            'message': f"{cs.name} is at {cs.percentage_level}% capacity ({cs.current_level_liters:,}L / {cs.capacity_liters:,}L).",
            'severity': 'CRITICAL',
            'created_at': cs.updated_at
        })

    # 6. Weather Impact Summary
    recent_rainfall = RainfallConfirmation.objects.all()[:10]
    total_recent_rainfall_mm = sum(float(r.rainfall_mm) for r in recent_rainfall)

    return Response({
        'summary': {
            'total_available_liters': total_available,
            'total_allocated_liters': water_allocated,
            'total_used_liters': water_used,
            'remaining_water_liters': remaining_water,
            'active_sources_count': active_sources_count,
            'pending_requests_count': pending_requests_count,
        },
        'demand_vs_availability': demand_vs_availability,
        'resource_alerts': resource_alerts,
        'weather_impact': {
            'recent_rainfall_events_count': recent_rainfall.count(),
            'total_recent_rainfall_mm': total_recent_rainfall_mm,
            'expected_water_contribution': 'Moderate rainwater recharge observed across Pala & Kottayam reservoirs.'
        }
    }, status=status.HTTP_200_OK)


# ─── WATER MANAGER REPORTS VIEW ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsWaterManagerOrAdmin])
def water_manager_reports(request):
    """Generate structured reports for Water Availability, Allocation, Usage, and Sources."""
    sources = WaterSourceSerializer(WaterSource.objects.all(), many=True).data
    requests = WaterAllocationRequestSerializer(WaterAllocationRequest.objects.all()[:20], many=True).data
    allocations = WaterAllocationSerializer(WaterAllocation.objects.all()[:20], many=True).data
    usages = WaterUsageSerializer(WaterUsage.objects.all()[:20], many=True).data

    return Response({
        'sources_report': sources,
        'requests_report': requests,
        'allocations_report': allocations,
        'usages_report': usages,
        'generated_at': timezone.now()
    }, status=status.HTTP_200_OK)
