import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WeatherData
from .serializers import WeatherDataSerializer
from .utils import fetch_open_meteo_data, get_location_coords
from farms.models import Farm, Field


class WeatherDataViewSet(viewsets.ModelViewSet):
    serializer_class = WeatherDataSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        qs = WeatherData.objects.filter(field__in=user_fields).select_related('field')
        field_id = self.request.query_params.get('field') or self.request.query_params.get('field_id')
        if field_id:
            qs = qs.filter(field__id=field_id)
        return qs

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """Get live current weather details for field, farm, or default location via Open-Meteo API."""
        field_id = request.query_params.get('field_id') or request.query_params.get('field')
        farm_id = request.query_params.get('farm_id') or request.query_params.get('farm')
        location_param = request.query_params.get('location') or request.query_params.get('city')
        
        target_field = None
        target_farm = None
        if field_id:
            target_field = Field.objects.filter(id=field_id).select_related('farm').first()
        elif farm_id:
            target_farm = Farm.objects.filter(id=farm_id).first()
        elif hasattr(request.user, 'id'):
            user_farms = Farm.objects.filter(user=request.user)
            target_field = Field.objects.filter(farm__in=user_farms).select_related('farm').first()
            if not target_field:
                target_farm = user_farms.first()

        lat, lon, city_name, has_location = get_location_coords(field=target_field, farm=target_farm, location_query=location_param)

        if not has_location:
            return Response({
                'has_location': False,
                'error': 'Please add the field location to view weather.',
                'field_name': target_field.name if target_field else (target_farm.name if target_farm else 'Selected Field'),
                'field_id': target_field.id if target_field else None,
            }, status=status.HTTP_200_OK)

        current_weather, _ = fetch_open_meteo_data(lat, lon, city_name=city_name)
        current_weather['has_location'] = True
        current_weather['field_id'] = target_field.id if target_field else None
        current_weather['field_name'] = target_field.name if target_field else (target_farm.name if target_farm else None)

        # Store or update weather log if target field exists
        if target_field:
            try:
                WeatherData.objects.create(
                    field=target_field,
                    temperature=current_weather['temperature'],
                    humidity=current_weather['humidity'],
                    wind_speed=current_weather['wind_speed'],
                    rainfall=current_weather['rain_probability'],
                    condition=current_weather['condition'].lower()
                )
            except Exception:
                pass

        return Response(current_weather)

    @action(detail=False, methods=['get'], url_path='forecast')
    def forecast(self, request):
        """Get live 5-day weather forecast via Open-Meteo API."""
        field_id = request.query_params.get('field_id') or request.query_params.get('field')
        farm_id = request.query_params.get('farm_id') or request.query_params.get('farm')
        location_param = request.query_params.get('location') or request.query_params.get('city')
        
        target_field = None
        target_farm = None
        if field_id:
            target_field = Field.objects.filter(id=field_id).select_related('farm').first()
        elif farm_id:
            target_farm = Farm.objects.filter(id=farm_id).first()
        elif hasattr(request.user, 'id'):
            user_farms = Farm.objects.filter(user=request.user)
            target_field = Field.objects.filter(farm__in=user_farms).select_related('farm').first()
            if not target_field:
                target_farm = user_farms.first()

        lat, lon, city_name, has_location = get_location_coords(field=target_field, farm=target_farm, location_query=location_param)

        if not has_location:
            return Response({
                'has_location': False,
                'error': 'Please add the field location to view weather.',
                'forecast': []
            }, status=status.HTTP_200_OK)

        _, forecast_data = fetch_open_meteo_data(lat, lon, city_name=city_name)

        return Response({'has_location': True, 'forecast': forecast_data})

    @action(detail=False, methods=['get'], url_path='crop-stage')
    def crop_stage(self, request):
        """Calculate automatic crop growth stage based on crop and sowing_date."""
        from datetime import datetime
        from django.utils import timezone

        crop_name = request.query_params.get('crop') or request.query_params.get('crop_type') or 'General'
        sowing_date_str = request.query_params.get('sowing_date') or request.query_params.get('planting_date')

        if not sowing_date_str:
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Please provide a valid sowing_date parameter (e.g. YYYY-MM-DD).'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            sowing_date = datetime.strptime(sowing_date_str.strip(), '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'success': False,
                'error': 'invalid_date_format',
                'message': 'Invalid sowing_date format. Please use YYYY-MM-DD format.'
            }, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        days_after_planting = max(0, (today - sowing_date).days)

        # Stage calculation thresholds (Days After Planting)
        if days_after_planting <= 15:
            current_stage = "Germination"
            next_stage = "Vegetative"
            days_until_next = 16 - days_after_planting
        elif days_after_planting <= 45:
            current_stage = "Vegetative"
            next_stage = "Flowering"
            days_until_next = 46 - days_after_planting
        elif days_after_planting <= 75:
            current_stage = "Flowering"
            next_stage = "Fruiting"
            days_until_next = 76 - days_after_planting
        elif days_after_planting <= 110:
            current_stage = "Fruiting"
            next_stage = "Harvesting"
            days_until_next = 111 - days_after_planting
        else:
            current_stage = "Harvesting"
            next_stage = None
            days_until_next = None

        return Response({
            'success': True,
            'crop': crop_name,
            'sowing_date': sowing_date_str,
            'days_after_planting': days_after_planting,
            'current_stage': current_stage,
            'crop_stage': current_stage,
            'next_stage': next_stage,
            'days_until_next_stage': days_until_next
        })
