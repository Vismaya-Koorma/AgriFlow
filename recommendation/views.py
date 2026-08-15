from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import SoilMoistureEstimation, IrrigationRecommendation, CropStressRisk, IrrigationPriority
from .serializers import (
    SoilMoistureEstimationSerializer, IrrigationRecommendationSerializer,
    CropStressRiskSerializer, IrrigationPrioritySerializer,
)
from farms.models import Farm, Field
from irrigation.models import IrrigationHistory, RainfallConfirmation


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_user_fields(user):
    user_farms = Farm.objects.filter(user=user)
    return Field.objects.filter(farm__in=user_farms).select_related('crop_type', 'soil_type', 'farm')


def estimate_moisture_status(temperature, humidity, rainfall_mm, soil_type_name, days_since_irrigation):
    """
    Rule-based soil moisture estimation.
    Returns: 'wet' | 'moderate' | 'dry'
    """
    score = 0

    # Humidity factor
    if humidity >= 70:
        score += 2
    elif humidity >= 50:
        score += 1

    # Rainfall factor
    if rainfall_mm >= 30:
        score += 3
    elif rainfall_mm >= 10:
        score += 2
    elif rainfall_mm >= 1:
        score += 1

    # Days since irrigation (higher = drier)
    if days_since_irrigation <= 1:
        score += 3
    elif days_since_irrigation <= 3:
        score += 2
    elif days_since_irrigation <= 7:
        score += 1

    # Temperature penalty (high temp = faster evaporation)
    if temperature > 35:
        score -= 2
    elif temperature > 30:
        score -= 1

    # Soil type adjustment
    soil = (soil_type_name or '').lower()
    if 'clay' in soil:
        score += 1   # Clay retains more moisture
    elif 'sandy' in soil or 'sand' in soil:
        score -= 1   # Sandy drains faster

    if score >= 5:
        return 'wet'
    elif score >= 2:
        return 'moderate'
    else:
        return 'dry'


def predict_crop_stress(temperature, humidity, rainfall_mm, moisture_status, days_since_irrigation, crop_stage, crop_type_name):
    """
    Rule-based crop stress prediction.
    Returns: (risk_level, stress_score, factors_dict, reason_text)
    """
    factors = {}
    score = 0

    # Temperature stress
    if temperature > 40:
        score += 30
        factors['high_temperature'] = f'{temperature}°C — critical heat stress'
    elif temperature > 35:
        score += 20
        factors['elevated_temperature'] = f'{temperature}°C — above optimal range'
    elif temperature < 15:
        score += 15
        factors['low_temperature'] = f'{temperature}°C — cold stress risk'

    # Moisture stress
    if moisture_status == 'dry':
        score += 30
        factors['soil_moisture'] = 'Soil estimated DRY — water deficit risk'
    elif moisture_status == 'moderate':
        score += 10
        factors['soil_moisture'] = 'Soil moisture MODERATE — monitor closely'

    # Days without irrigation
    if days_since_irrigation > 7:
        score += 25
        factors['irrigation_gap'] = f'{days_since_irrigation} days since last irrigation'
    elif days_since_irrigation > 4:
        score += 10
        factors['irrigation_gap'] = f'{days_since_irrigation} days since last irrigation'

    # Humidity stress
    if humidity < 30:
        score += 15
        factors['low_humidity'] = f'{humidity}% — very dry atmosphere'
    elif humidity > 90:
        score += 10
        factors['high_humidity'] = f'{humidity}% — fungal disease risk'

    # Crop stage sensitivity
    critical_stages = ['flowering', 'fruiting']
    if crop_stage in critical_stages:
        score = int(score * 1.2)  # 20% multiplier for sensitive stages
        factors['crop_stage'] = f'{crop_stage.title()} stage — highly sensitive period'

    # Rainfall benefit
    if rainfall_mm >= 20:
        score = max(0, score - 15)
        factors['recent_rainfall'] = f'{rainfall_mm}mm recent rainfall — reducing stress'

    # Determine risk level
    if score >= 50:
        risk_level = 'high'
    elif score >= 25:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    reason = '; '.join(factors.values()) if factors else 'Conditions within normal parameters.'
    return risk_level, min(score, 100), factors, reason


def calculate_water_requirement(crop_type_name, area_acres, crop_stage, soil_type_name, temperature, rainfall_mm):
    """
    Rule-based water requirement estimation.
    Returns litres required.
    """
    # Base water requirement per acre per irrigation (litres)
    base_rates = {
        'rice': 15000,
        'paddy': 15000,
        'wheat': 8000,
        'maize': 6000,
        'corn': 6000,
        'tomato': 7000,
        'potato': 7500,
        'sugarcane': 12000,
        'cotton': 9000,
        'coconut': 5000,
        'banana': 8000,
        'default': 7000,
    }
    crop_key = (crop_type_name or 'default').lower()
    base = next((v for k, v in base_rates.items() if k in crop_key), base_rates['default'])

    # Stage multiplier
    stage_multipliers = {
        'germination': 0.6,
        'vegetative': 0.9,
        'flowering': 1.2,
        'fruiting': 1.1,
        'harvesting': 0.5,
    }
    stage_mult = stage_multipliers.get(crop_stage, 1.0)

    # Temperature multiplier
    if temperature > 35:
        temp_mult = 1.25
    elif temperature > 30:
        temp_mult = 1.10
    else:
        temp_mult = 1.0

    # Rainfall deduction
    rainfall_deduction = min(rainfall_mm * 200, base * 0.4)

    # Soil adjustment
    soil = (soil_type_name or '').lower()
    if 'sandy' in soil or 'sand' in soil:
        soil_mult = 1.2  # Drains faster, needs more
    elif 'clay' in soil:
        soil_mult = 0.85  # Retains more
    else:
        soil_mult = 1.0

    total_litres = ((base * stage_mult * temp_mult * soil_mult) - rainfall_deduction) * float(area_acres)
    return max(round(total_litres), 0)


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class SoilMoistureViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SoilMoistureEstimationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SoilMoistureEstimation.objects.filter(
            field__in=get_user_fields(self.request.user)
        ).select_related('field')

    @action(detail=False, methods=['post'], url_path='estimate')
    def estimate(self, request):
        """Generate and store a soil moisture estimation for a field."""
        user_fields = get_user_fields(request.user)
        field_id = request.data.get('field_id') or request.query_params.get('field_id')
        target_field = user_fields.filter(id=field_id).first() if field_id else user_fields.first()

        if not target_field:
            return Response({'error': 'No fields found. Please add a field first.'}, status=404)

        temperature = float(request.data.get('temperature', 30))
        humidity = float(request.data.get('humidity', 60))
        rainfall_mm = float(request.data.get('rainfall_mm', 0))
        soil_type_name = target_field.soil_type.name if target_field.soil_type else 'loamy'

        # Get days since last irrigation
        last_irr = IrrigationHistory.objects.filter(field=target_field).order_by('-irrigated_at').first()
        if last_irr:
            delta = timezone.now() - last_irr.irrigated_at
            days_since = delta.days
        else:
            days_since = 5  # Assume 5 days if no record

        moisture_status = estimate_moisture_status(temperature, humidity, rainfall_mm, soil_type_name, days_since)
        moisture_map = {'wet': Decimal('80.0'), 'moderate': Decimal('50.0'), 'dry': Decimal('20.0')}
        moisture_pct = moisture_map[moisture_status]

        obj = SoilMoistureEstimation.objects.create(
            field=target_field,
            estimated_moisture=moisture_pct,
            confidence_score=Decimal('0.82'),
            model_version='rule_engine_v2'
        )

        return Response({
            'id': obj.id,
            'field': target_field.id,
            'field_name': target_field.name,
            'moisture_status': moisture_status,
            'estimated_moisture': float(moisture_pct),
            'days_since_irrigation': days_since,
            'soil_type': soil_type_name,
            'inputs': {
                'temperature': temperature,
                'humidity': humidity,
                'rainfall_mm': rainfall_mm,
            },
            'estimated_at': obj.estimated_at,
        })

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """Get latest moisture estimation per field."""
        user_fields = get_user_fields(request.user)
        results = []
        for field in user_fields:
            last = SoilMoistureEstimation.objects.filter(field=field).order_by('-estimated_at').first()
            moisture_pct = float(last.estimated_moisture) if last else None
            if moisture_pct is not None:
                if moisture_pct >= 65:
                    status_label = 'wet'
                elif moisture_pct >= 35:
                    status_label = 'moderate'
                else:
                    status_label = 'dry'
            else:
                status_label = 'unknown'

            results.append({
                'field_id': field.id,
                'field_name': field.name,
                'crop_type': field.crop_type.name if field.crop_type else None,
                'soil_type': field.soil_type.name if field.soil_type else None,
                'moisture_status': status_label,
                'estimated_moisture': moisture_pct,
                'estimated_at': last.estimated_at if last else None,
            })
        return Response(results)


from weather.utils import fetch_open_meteo_data, get_location_coords


class RecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = IrrigationRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return IrrigationRecommendation.objects.filter(
            field__in=get_user_fields(self.request.user)
        ).select_related('field')

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """Rule-based Smart Irrigation Recommendation powered by Live Open-Meteo Weather."""
        user_fields = get_user_fields(request.user)
        field_id = request.query_params.get('field_id') or request.query_params.get('field')
        farm_id = request.query_params.get('farm_id') or request.query_params.get('farm')

        target_field = None
        target_farm = None
        if field_id:
            target_field = user_fields.filter(id=field_id).first()
        elif farm_id:
            target_farm = Farm.objects.filter(id=farm_id, user=request.user).first()
        else:
            target_field = user_fields.first()
            if not target_field:
                target_farm = Farm.objects.filter(user=request.user).first()

        field_name = target_field.name if target_field else (target_farm.name if target_farm else 'All Active Fields')
        crop_type = target_field.crop_type.name if (target_field and target_field.crop_type) else 'Paddy'

        # Fetch live weather data for target location
        lat, lon, city_name, has_location = get_location_coords(field=target_field, farm=target_farm)

        if not has_location:
            return Response({
                'has_location': False,
                'error': 'Please add the field location to view weather.',
                'recommendation': 'Location Required',
                'recommendation_text': 'Please add the field location to view weather.',
                'status': 'no_location',
                'recommendation_status': 'no_location',
                'priority': 'Low',
                'estimated_water_requirement': 'N/A',
                'water_volume_litres': 0,
                'reason': 'Please configure District/State or Latitude/Longitude for this field to calculate weather-based irrigation advice.',
                'field_id': target_field.id if target_field else None,
                'field_name': field_name,
                'crop_type': crop_type,
                'weather': None,
                'generated_at': timezone.now().isoformat()
            })

        live_weather, _ = fetch_open_meteo_data(lat, lon, city_name=city_name)

        temp = live_weather.get('temperature', 29.5)
        humidity = live_weather.get('humidity', 75.0)
        wind_speed = live_weather.get('wind_speed', 14.0)
        rain_prob = live_weather.get('rain_probability', 20.0)
        condition = live_weather.get('condition', 'Partly Cloudy')

        # Mandatory Rule-Based Engine
        # Rule 1: Rain Probability > 70% -> Postpone Irrigation
        if rain_prob > 70:
            rec_text = "Postpone Irrigation"
            status_code = "postpone"
            priority = "Low"
            water_requirement_str = "0 Liters"
            water_litres = 0
            reason = f"Heavy rain expected ({rain_prob}% probability). Natural rainfall will meet crop water requirements."

        # Rule 2: Temp > 32°C and Rain Probability < 20% -> Irrigate Today
        elif temp > 32 and rain_prob < 20:
            rec_text = "Irrigate Today"
            status_code = "irrigate"
            priority = "High"
            water_requirement_str = "45,000 Liters"
            water_litres = 45000
            reason = f"High temperature ({temp}°C) and low rainfall probability ({rain_prob}%). Immediate irrigation required to prevent crop heat stress."

        # Rule 3: Humidity > 80% -> Reduce Water Quantity
        elif humidity > 80:
            rec_text = "Reduce Water Quantity"
            status_code = "reduce_water"
            priority = "Medium"
            water_requirement_str = "20,000 Liters"
            water_litres = 20000
            reason = f"High atmospheric humidity ({humidity}%). Evapotranspiration rate is low."

        # Rule 4: Wind Speed > 25 km/h -> Avoid Sprinkler Irrigation
        elif wind_speed > 25:
            rec_text = "Avoid Sprinkler Irrigation"
            status_code = "avoid_sprinkler"
            priority = "High"
            water_requirement_str = "25,000 Liters"
            water_litres = 25000
            reason = f"High wind speed ({wind_speed} km/h). Sprinkler drift will cause uneven water distribution. Use drip irrigation instead."

        # Rule 5: Default Moderate Weather -> Normal Irrigation Schedule
        else:
            rec_text = "Normal Irrigation Schedule"
            status_code = "normal"
            priority = "Medium"
            water_requirement_str = "30,000 Liters"
            water_litres = 30000
            reason = f"Optimal weather conditions ({temp}°C, {humidity}% humidity, {wind_speed} km/h wind). Maintain regular watering schedule."

        return Response({
            'recommendation': rec_text,
            'recommendation_text': rec_text,
            'status': status_code,
            'recommendation_status': status_code,
            'priority': priority,
            'estimated_water_requirement': water_requirement_str,
            'water_volume_litres': water_litres,
            'estimated_water_litres': water_litres,
            'reason': reason,
            'field_id': target_field.id if target_field else None,
            'field_name': field_name,
            'crop_type': crop_type,
            'weather': {
                'temperature': temp,
                'humidity': humidity,
                'wind_speed': wind_speed,
                'rain_probability': rain_prob,
                'condition': condition,
                'city': city_name
            },
            'generated_at': timezone.now().isoformat()
        })


class CropStressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CropStressRiskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CropStressRisk.objects.filter(
            field__in=get_user_fields(self.request.user)
        ).select_related('field')

    @action(detail=False, methods=['post'], url_path='predict')
    def predict(self, request):
        """Run crop stress prediction for all fields or a specific field."""
        user_fields = get_user_fields(request.user)
        field_id = request.data.get('field_id') or request.query_params.get('field_id')
        fields_to_process = user_fields.filter(id=field_id) if field_id else user_fields

        temperature = float(request.data.get('temperature', 30))
        humidity = float(request.data.get('humidity', 65))

        latest_rainfall = RainfallConfirmation.objects.filter(
            field__in=user_fields
        ).order_by('-confirmed_at').first()
        rainfall_mm = float(latest_rainfall.rainfall_mm or 0) if latest_rainfall else 0

        results = []
        for field in fields_to_process:
            last_irr = IrrigationHistory.objects.filter(field=field).order_by('-irrigated_at').first()
            days_since = (timezone.now() - last_irr.irrigated_at).days if last_irr else 5
            soil_type = field.soil_type.name if field.soil_type else 'Loamy'
            crop_type = field.crop_type.name if field.crop_type else 'General'
            crop_stage = field.crop_stage or 'vegetative'
            moisture_status = estimate_moisture_status(temperature, humidity, rainfall_mm, soil_type, days_since)

            risk_level, stress_score, factors, reason = predict_crop_stress(
                temperature, humidity, rainfall_mm, moisture_status, days_since, crop_stage, crop_type
            )

            # Store in DB
            obj = CropStressRisk.objects.create(
                field=field,
                risk_level=risk_level,
                stress_score=Decimal(str(stress_score)),
                factors=factors,
            )

            results.append({
                'id': obj.id,
                'field_id': field.id,
                'field_name': field.name,
                'crop_type': crop_type,
                'crop_stage': crop_stage,
                'risk_level': risk_level,
                'stress_score': stress_score,
                'reason': reason,
                'factors': factors,
                'moisture_status': moisture_status,
                'assessed_at': obj.assessed_at,
            })

        return Response(results)

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """Latest crop stress per field."""
        user_fields = get_user_fields(request.user)
        results = []
        for field in user_fields:
            last = CropStressRisk.objects.filter(field=field).order_by('-assessed_at').first()
            if last:
                results.append({
                    'field_id': field.id,
                    'field_name': field.name,
                    'crop_type': field.crop_type.name if field.crop_type else 'N/A',
                    'crop_stage': field.crop_stage,
                    'risk_level': last.risk_level,
                    'stress_score': float(last.stress_score),
                    'factors': last.factors,
                    'assessed_at': last.assessed_at,
                })
        return Response(results)


class WaterRequirementViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='calculate')
    def calculate(self, request):
        """Calculate water requirement based on field + weather inputs."""
        user_fields = get_user_fields(request.user)
        field_id = request.data.get('field_id')
        temperature = float(request.data.get('temperature', 30))
        rainfall_mm = float(request.data.get('rainfall_mm', 0))

        target_field = user_fields.filter(id=field_id).first() if field_id else user_fields.first()
        if not target_field:
            return Response({'error': 'No field found.'}, status=404)

        crop_type = target_field.crop_type.name if target_field.crop_type else 'General'
        soil_type = target_field.soil_type.name if target_field.soil_type else 'Loamy'
        crop_stage = target_field.crop_stage
        area = float(target_field.area or 1)

        required_litres = calculate_water_requirement(crop_type, area, crop_stage, soil_type, temperature, rainfall_mm)
        duration_min = round(required_litres / 50)  # 50 L/min flow rate estimate

        return Response({
            'field_id': target_field.id,
            'field_name': target_field.name,
            'crop_type': crop_type,
            'soil_type': soil_type,
            'crop_stage': crop_stage,
            'area_acres': area,
            'inputs': {
                'temperature': temperature,
                'rainfall_mm': rainfall_mm,
            },
            'estimated_water_litres': required_litres,
            'estimated_duration_minutes': duration_min,
            'summary': f'{crop_type} in {crop_stage} stage on {area} acres of {soil_type} soil at {temperature}°C after {rainfall_mm}mm rainfall.',
            'calculated_at': timezone.now(),
        })


class IrrigationPriorityViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return self.rank(request)

    @action(detail=False, methods=['get'], url_path='rank')
    def rank(self, request):
        """Rank all fields by irrigation priority."""
        user_fields = get_user_fields(request.user)

        latest_rainfall = RainfallConfirmation.objects.filter(
            field__in=user_fields
        ).order_by('-confirmed_at').first()
        rainfall_mm = float(latest_rainfall.rainfall_mm or 0) if latest_rainfall else 0

        prioritized = []
        for field in user_fields:
            last_irr = IrrigationHistory.objects.filter(field=field).order_by('-irrigated_at').first()
            days_since = (timezone.now() - last_irr.irrigated_at).days if last_irr else 5
            soil_type = field.soil_type.name if field.soil_type else 'Loamy'
            crop_stage = field.crop_stage or 'vegetative'
            crop_type = field.crop_type.name if field.crop_type else 'General'
            temperature = 30
            humidity = 65

            moisture_status = estimate_moisture_status(temperature, humidity, rainfall_mm, soil_type, days_since)
            risk_level, stress_score, factors, reason = predict_crop_stress(
                temperature, humidity, rainfall_mm, moisture_status, days_since, crop_stage, crop_type
            )

            # Priority scoring
            priority_score = stress_score
            if moisture_status == 'dry':
                priority_score += 30
            elif moisture_status == 'moderate':
                priority_score += 10

            if crop_stage in ['flowering', 'fruiting']:
                priority_score += 20

            priority_score += min(days_since * 3, 30)

            explanation = []
            if moisture_status == 'dry':
                explanation.append('Soil estimated DRY — urgent irrigation needed')
            if risk_level == 'high':
                explanation.append(f'High crop stress score ({stress_score})')
            if days_since > 3:
                explanation.append(f'{days_since} days since last irrigation')
            if crop_stage in ['flowering', 'fruiting']:
                explanation.append(f'Critical growth stage: {crop_stage.title()}')
            if not explanation:
                explanation.append('Normal conditions — lower priority')

            prioritized.append({
                'field_id': field.id,
                'field_name': field.name,
                'crop_type': crop_type,
                'crop_stage': crop_stage,
                'moisture_status': moisture_status,
                'risk_level': risk_level,
                'stress_score': stress_score,
                'priority_score': priority_score,
                'days_since_irrigation': days_since,
                'explanation': '; '.join(explanation),
            })

        # Sort by descending priority score and assign rank
        prioritized.sort(key=lambda x: x['priority_score'], reverse=True)
        for i, item in enumerate(prioritized):
            item['priority_rank'] = i + 1

        return Response(prioritized)
