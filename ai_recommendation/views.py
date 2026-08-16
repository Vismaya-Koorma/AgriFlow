import os
import math
import joblib
import numpy as np
from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from farms.models import Farm, Field
from irrigation.models import IrrigationHistory
from weather.utils import get_location_coords, fetch_open_meteo_data

from .models import AIRecommendationLog
from .serializers import AIRecommendationLogSerializer

# ─── Load ML Model once at module load ────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MODEL_PATH = os.path.join(_BASE_DIR, 'ml_models', 'ai_irrigation_model.pkl')
_MODEL_PACKAGE = None

def _get_model():
    global _MODEL_PACKAGE
    if _MODEL_PACKAGE is None:
        try:
            _MODEL_PACKAGE = joblib.load(_MODEL_PATH)
        except Exception as e:
            _MODEL_PACKAGE = None
    return _MODEL_PACKAGE


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _build_ai_explanation(irrigation_needed, crop_stress, water, temp, humidity, rainfall, days_since, crop_name):
    """Build a natural-language explanation for the AI recommendation."""
    lines = []

    if temp > 32:
        lines.append(f"High temperature ({temp}°C) is increasing crop transpiration.")
    elif temp < 24:
        lines.append(f"Mild temperature ({temp}°C) reduces immediate water need.")

    if humidity < 55:
        lines.append(f"Low humidity ({humidity}%) is accelerating soil moisture loss.")
    elif humidity > 80:
        lines.append("High atmospheric humidity is reducing immediate water demand.")

    if rainfall < 5:
        lines.append("No significant rainfall expected — soil moisture will not be replenished naturally.")
    elif rainfall > 20:
        lines.append(f"Significant rainfall ({rainfall}mm) is expected — irrigation may not be required.")

    if days_since is not None and days_since >= 3:
        lines.append(f"{days_since} days since last irrigation — field moisture is likely depleted.")
    elif days_since is not None and days_since < 2:
        lines.append("Recent irrigation means soil moisture may still be adequate.")

    crop_label = f"{crop_name} crop" if crop_name else "the crop"

    if irrigation_needed:
        lines.append(f"Based on current conditions and {crop_label} water requirements, irrigation is recommended today.")
    else:
        lines.append(f"Current conditions are favorable for {crop_label}. No immediate irrigation is required.")

    return " ".join(lines)


def _get_days_since_last_irrigation(field=None, farm=None):
    """Get number of days since the last irrigation event for the field/farm."""
    try:
        if field:
            last = IrrigationHistory.objects.filter(field=field).order_by('-irrigated_at').first()
        elif farm:
            last = IrrigationHistory.objects.filter(field__farm=farm).order_by('-irrigated_at').first()
        else:
            return 3  # default fallback
        if last:
            delta = timezone.now() - last.irrigated_at
            return max(0, delta.days)
    except Exception:
        pass
    return 3  # default: 3 days if unknown


def _get_prev_water_litres(field=None, farm=None):
    """Get cumulative irrigation in last 7 days in litres."""
    try:
        week_ago = timezone.now() - timedelta(days=7)
        if field:
            qs = IrrigationHistory.objects.filter(field=field, irrigated_at__gte=week_ago)
        elif farm:
            qs = IrrigationHistory.objects.filter(field__farm=farm, irrigated_at__gte=week_ago)
        else:
            return 0
        return float(qs.aggregate(__import__('django.db.models', fromlist=['Sum']).Sum('volume_litres'))['volume_litres__sum'] or 0)
    except Exception:
        return 0


from irrigation.services import calculate_crop_water_deficit


def _run_ml_inference(weather, field=None, farm=None):
    """Run ML model inference for crop stress and compute scientific water deficit."""
    # 1. Run Random Forest model for crop stress classification (UNTOUCHED ML model)
    model_pkg = _get_model()
    stress_label = 'Low'
    
    if model_pkg is not None:
        try:
            clf_stress = model_pkg['clf_stress']
            crop_encoder = model_pkg['crop_encoder']
            soil_encoder = model_pkg['soil_encoder']
            stress_encoder = model_pkg['stress_encoder']

            temp = float(weather.get('temperature', 29.0))
            humidity = float(weather.get('humidity', 70.0))
            rainfall = float(weather.get('rain_probability', 10.0))
            wind_speed = float(weather.get('wind_speed', 12.0))

            crop_name = 'Paddy'
            soil_name = 'Loam'
            area = 1.0
            if field:
                crop_name = (field.crop_type.name if field.crop_type else 'Paddy')
                soil_name = (field.soil_type.name if field.soil_type else 'Loam')
                area = float(field.area or 1.0)
            elif farm:
                area = float(farm.total_area or 1.0)

            try:
                crop_enc = int(crop_encoder.transform([crop_name])[0])
            except ValueError:
                crop_enc = 0
            try:
                soil_enc = int(soil_encoder.transform([soil_name])[0])
            except ValueError:
                soil_enc = 0

            days_since = _get_days_since_last_irrigation(field=field, farm=farm)
            prev_water = _get_prev_water_litres(field=field, farm=farm)

            X = np.array([[temp, humidity, rainfall, wind_speed, crop_enc, soil_enc, area, days_since, prev_water]])
            stress_pred_enc = int(clf_stress.predict(X)[0])
            stress_label = stress_encoder.classes_[stress_pred_enc]
        except Exception:
            stress_label = 'Low'

    # 2. Run Scientific Crop-Water-Demand Calculation Engine
    calc_res = calculate_crop_water_deficit(field=field, farm=farm, weather_data=weather)

    return {
        'irrigation_needed': calc_res['irrigation_needed'],
        'recommendation': calc_res['recommendation'],
        'priority': calc_res['priority'],
        'recommended_water_liters': calc_res['recommended_water_liters'],
        'recommended_water': calc_res['recommended_water_liters'],
        'unit': 'Liters',
        'crop_stress': stress_label,
        'confidence': calc_res['confidence'],
        'reason': calc_res['reason'],
        'crop_name': calc_res['crop_name'],
        'crop_stage': calc_res['crop_stage'],
        'soil_type': calc_res['soil_type'],
        'area_acres': calc_res['area_acres'],
        'field_area_m2': calc_res['field_area_m2'],
        'today_crop_demand_liters': calc_res['today_crop_demand_liters'],
        'previous_unmet_deficit_liters': calc_res['previous_unmet_deficit_liters'],
        'useful_carryover_liters': calc_res['useful_carryover_liters'],
        'effective_rainfall_liters': calc_res['effective_rainfall_liters'],
        'net_water_deficit_liters': calc_res['net_water_deficit_liters'],
        'yesterday_irrigation_liters': calc_res['yesterday_irrigation_liters'],
        'weather_snapshot': calc_res['weather_snapshot'],
        'days_since_irrigation': _get_days_since_last_irrigation(field=field, farm=farm),
    }



# ─── Django ViewSet ────────────────────────────────────────────────────────────

class AIRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """AI Irrigation Recommendation endpoints."""
    serializer_class = AIRecommendationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        return AIRecommendationLog.objects.filter(
            field__in=user_fields
        ).select_related('field', 'farm').union(
            AIRecommendationLog.objects.filter(
                farm__in=user_farms, field__isnull=True
            ).select_related('field', 'farm')
        ).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='recommendation')
    def recommend(self, request):
        """GET /api/ai/recommendation/?field_id=X or farm_id=Y"""
        field_id = request.query_params.get('field_id') or request.query_params.get('field')
        farm_id = request.query_params.get('farm_id') or request.query_params.get('farm')

        target_field = None
        target_farm = None

        user_farms = Farm.objects.filter(user=request.user)
        user_fields = Field.objects.filter(farm__in=user_farms).select_related('farm', 'crop_type', 'soil_type')

        if field_id:
            target_field = user_fields.filter(id=field_id).first()
        elif farm_id:
            target_farm = user_farms.filter(id=farm_id).first()
        else:
            target_field = user_fields.first()
            if not target_field:
                target_farm = user_farms.first()

        # Fetch live weather
        lat, lon, city_name, has_location = get_location_coords(field=target_field, farm=target_farm)

        if not has_location:
            return Response({
                'error': 'location_missing',
                'message': 'Please complete the field information to generate AI recommendations.',
            }, status=status.HTTP_200_OK)

        try:
            live_weather, _ = fetch_open_meteo_data(lat, lon, city_name=city_name)
        except Exception:
            return Response({
                'error': 'weather_unavailable',
                'message': 'AI recommendation unavailable because weather data could not be retrieved.',
            }, status=status.HTTP_200_OK)

        # Run ML model
        result = _run_ml_inference(live_weather, field=target_field, farm=target_farm)
        if result is None:
            return Response({
                'error': 'model_unavailable',
                'message': 'AI model is currently unavailable. Please try again later.',
            }, status=status.HTTP_200_OK)

        # Persist prediction to DB
        try:
            log = AIRecommendationLog.objects.create(
                field=target_field,
                farm=target_farm if not target_field else None,
                irrigation_needed=result['irrigation_needed'],
                recommended_water_l_m2=result['recommended_water'],
                crop_stress=result['crop_stress'],
                confidence=result['confidence'],
                reason=result['reason'],
                temperature=result['weather_snapshot']['temperature'],
                humidity=result['weather_snapshot']['humidity'],
                rainfall=result['weather_snapshot']['rainfall'],
                wind_speed=result['weather_snapshot']['wind_speed'],
                days_since_irrigation=result['days_since_irrigation'],
            )
        except Exception:
            log = None

        # Create Alert Notification if target_field is present
        if target_field:
            try:
                from alerts.services import create_irrigation_notification
                create_irrigation_notification(
                    field=target_field,
                    priority=result.get('priority', 'LOW'),
                    recommended_water_liters=result.get('recommended_water_liters', 0),
                    recommendation_title=result.get('recommendation', 'Irrigation Needed'),
                    reason=result.get('reason', '')
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to create AI irrigation alert: {e}")

        field_name = target_field.name if target_field else (target_farm.name if target_farm else 'Farm')
        location_display = city_name or 'Selected Location'

        return Response({
            'field_id': target_field.id if target_field else None,
            'farm_id': target_farm.id if target_farm else None,
            'field_name': field_name,
            'location': location_display,
            'irrigation_needed': result['irrigation_needed'],
            'recommended_water': result['recommended_water'],
            'unit': result['unit'],
            'crop_stress': result['crop_stress'],
            'confidence': result['confidence'],
            'reason': result['reason'],
            'weather': result['weather_snapshot'],
            'days_since_irrigation': result['days_since_irrigation'],
            'has_location': True,
            'log_id': log.id if log else None,
        })

    @action(detail=False, methods=['get'], url_path='logs')
    def logs(self, request):
        """GET /api/ai/logs/ — AI prediction history for Reports & Analytics."""
        user_farms = Farm.objects.filter(user=request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        logs = AIRecommendationLog.objects.filter(
            field__in=user_fields
        ).select_related('field', 'farm').order_by('-created_at')[:100]
        serializer = AIRecommendationLogSerializer(logs, many=True)
        return Response(serializer.data)
