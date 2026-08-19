from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SimulationHistory
from .serializers import SimulationHistorySerializer
from .services import (
    get_total_available_water,
    calculate_field_priority,
    optimize_water_allocation,
    generate_action_plan,
    run_what_if_simulation
)
from farms.models import Field


class DecisionIntelligenceViewSet(viewsets.ViewSet):
    """
    DRF ViewSet providing system-level Agricultural Decision Support:
    - Transparent Field Priority Scores
    - Optimized Water Allocation
    - What-If Water Simulations
    - Impact Analysis & Agricultural Action Plans
    - Simulation Audit History
    """
    permission_classes = [permissions.IsAuthenticated]

    def _check_access(self, request):
        role = getattr(request.user, 'role', '').lower()
        if role not in ['manager', 'admin', 'supervisor']:
            return False
        return True

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        if not self._check_access(request):
            return Response({'error': 'Unauthorized role for Decision Intelligence module.'}, status=status.HTTP_403_FORBIDDEN)

        active_fields = Field.objects.filter(is_active=True).select_related('crop_type', 'soil_type', 'farm', 'farm__user')
        if not active_fields.exists():
            return Response({
                'has_data': False,
                'message': 'No active fields found in system. Please add fields first.',
                'total_available_water': 0,
                'priorities': [],
                'allocation': {},
                'action_plan': [],
                'recent_simulations': []
            })

        field_priorities = [calculate_field_priority(f) for f in active_fields]
        available_water = get_total_available_water()
        allocation_result = optimize_water_allocation(field_priorities, available_water)
        action_plan = generate_action_plan(allocation_result)

        recent_simulations = SimulationHistorySerializer(
            SimulationHistory.objects.all()[:5], many=True
        ).data

        return Response({
            'has_data': True,
            'total_available_water': round(available_water),
            'summary': allocation_result['summary_counts'],
            'total_requested_water': allocation_result['total_requested_water'],
            'total_allocated_water': allocation_result['total_allocated_water'],
            'water_deficit_surplus': allocation_result['water_deficit_surplus'],
            'utilization_percentage': allocation_result['utilization_percentage'],
            'priorities': allocation_result['allocations'],
            'action_plan': action_plan,
            'recent_simulations': recent_simulations
        })

    @action(detail=False, methods=['get'], url_path='priorities')
    def priorities(self, request):
        if not self._check_access(request):
            return Response({'error': 'Unauthorized role.'}, status=status.HTTP_403_FORBIDDEN)

        active_fields = Field.objects.filter(is_active=True).select_related('crop_type', 'soil_type', 'farm', 'farm__user')
        field_priorities = [calculate_field_priority(f) for f in active_fields]
        available_water = get_total_available_water()
        allocation_result = optimize_water_allocation(field_priorities, available_water)

        return Response(allocation_result['allocations'])

    @action(detail=False, methods=['post'], url_path='simulate')
    def simulate(self, request):
        if not self._check_access(request):
            return Response({'error': 'Unauthorized role.'}, status=status.HTTP_403_FORBIDDEN)

        reduction_percentage = request.data.get('reduction_percentage')
        custom_water_liters = request.data.get('custom_water_liters')
        save_history = request.data.get('save_history', False)

        active_fields = Field.objects.filter(is_active=True).select_related('crop_type', 'soil_type', 'farm', 'farm__user')
        field_priorities = [calculate_field_priority(f) for f in active_fields]

        simulation_result = run_what_if_simulation(
            user=request.user,
            reduction_percentage=reduction_percentage,
            custom_water_liters=custom_water_liters,
            fields_list=field_priorities
        )

        # Optionally save simulation audit log
        if save_history:
            impact = simulation_result['impact_analysis']
            sim_obj = SimulationHistory.objects.create(
                created_by=request.user,
                original_water_liters=impact['current_available_water'],
                simulated_water_liters=impact['simulated_available_water'],
                reduction_percentage=impact['reduction_percentage'],
                total_fields_count=len(field_priorities),
                affected_fields_count=impact['simulated_partial_fields'] + impact['simulated_zero_fields'],
                major_affected_field=impact['major_affected_field'],
                summary=impact['impact_summary'],
                action_plan_snapshot=simulation_result['action_plan']
            )
            simulation_result['saved_simulation_id'] = sim_obj.id

        return Response(simulation_result)

    @action(detail=False, methods=['get'], url_path='simulation-history')
    def simulation_history(self, request):
        if not self._check_access(request):
            return Response({'error': 'Unauthorized role.'}, status=status.HTTP_403_FORBIDDEN)

        sims = SimulationHistory.objects.all()[:20]
        serializer = SimulationHistorySerializer(sims, many=True)
        return Response(serializer.data)
