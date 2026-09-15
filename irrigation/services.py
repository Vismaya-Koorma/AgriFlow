import math
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from irrigation.models import IrrigationHistory, RainfallConfirmation
from master.models import CropType, SoilType, CropVariety, CropWaterRequirement

# ─── Default Crop Water Requirements & Growth Stage Coefficients ─────────────────────────────
# Base daily water requirement in Liters / m² / day under standard baseline weather (25°C, 65% RH, 10 km/h wind)
CROP_WATER_CONFIGS = {
    'rice': {'daily_req_l_m2': 6.0, 'kc': 1.10, 'min_req': 4.0, 'max_req': 9.0},
    'paddy': {'daily_req_l_m2': 6.0, 'kc': 1.10, 'min_req': 4.0, 'max_req': 9.0},
    'tomato': {'daily_req_l_m2': 4.0, 'kc': 1.05, 'min_req': 2.5, 'max_req': 6.0},
    'banana': {'daily_req_l_m2': 5.5, 'kc': 1.10, 'min_req': 3.5, 'max_req': 8.0},
    'coconut': {'daily_req_l_m2': 6.5, 'kc': 1.00, 'min_req': 4.0, 'max_req': 9.0},
    'vegetables': {'daily_req_l_m2': 4.0, 'kc': 0.95, 'min_req': 2.5, 'max_req': 5.5},
    'corn': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
    'maize': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
    'wheat': {'daily_req_l_m2': 3.8, 'kc': 0.95, 'min_req': 2.5, 'max_req': 5.5},
    'sugarcane': {'daily_req_l_m2': 6.5, 'kc': 1.15, 'min_req': 4.5, 'max_req': 9.5},
    'cotton': {'daily_req_l_m2': 4.8, 'kc': 1.00, 'min_req': 3.0, 'max_req': 7.0},
    'default': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
}

GROWTH_STAGE_FACTORS = {
    'germination': 0.70,
    'initial': 0.70,
    'vegetative': 1.00,
    'flowering': 1.15,
    'fruiting': 1.10,
    'harvesting': 0.75,
    'late': 0.75,
}

SOIL_RETENTION_FACTORS = {
    'clay': 0.70,      # Clay retains 70% carryover
    'loam': 0.50,      # Loam retains 50% carryover
    'loamy': 0.50,
    'sandy': 0.30,      # Sandy retains 30% carryover
    'sand': 0.30,
    'default': 0.50,
}


def calculate_crop_water_deficit(
    field=None,
    farm=None,
    weather_data=None,
    override_temp=None,
    override_humidity=None,
    override_wind=None,
    override_rain_forecast_mm=None,
    override_yesterday_irrigation_l=None,
):
    """
    Calculates scientific crop water requirement and water deficit (in Liters) for a field/farm.
    Utilizes PostgreSQL CropWaterRequirement database with multi-tier fallback to hardcoded default configs.
    """
    weather_data = weather_data or {}

    # Extract Crop Info
    crop_name = 'Paddy / Rice'
    crop_key = 'paddy'
    crop_stage_key = 'vegetative'
    soil_type_name = 'Loam'
    area_acres = 1.0
    crop_type_obj = None
    crop_variety_obj = None
    soil_type_obj = None

    if field:
        crop_type_obj = field.crop_type
        crop_variety_obj = getattr(field, 'crop_variety', None)
        soil_type_obj = field.soil_type

        if field.crop_type:
            crop_name = field.crop_type.name
            crop_key = field.crop_type.name.lower()
        if field.soil_type:
            soil_type_name = field.soil_type.name
        area_acres = float(field.area or 1.0)
        crop_stage_key = (field.crop_stage or 'vegetative').lower()
    elif farm:
        area_acres = float(farm.total_area or 1.0)

    # Area Conversion: 1 acre = 4046.86 m²
    field_area_m2 = area_acres * 4046.86

    # Crop Baseline Config Lookup via PostgreSQL DB with Fallback Hierarchy
    db_water_req = None
    water_source_info = 'System Default Baseline'
    source_reference = None
    variety_name = crop_variety_obj.variety_name if crop_variety_obj else None

    if crop_type_obj:
        # Level 1: Crop + Variety + Stage + Soil
        if crop_variety_obj and soil_type_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj, crop_stage=crop_stage_key, soil_type=soil_type_obj
            ).first()

        # Level 2: Crop + Variety + Stage
        if not db_water_req and crop_variety_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj, crop_stage=crop_stage_key
            ).first()

        # Level 3: Crop + Variety
        if not db_water_req and crop_variety_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj
            ).first()

import math
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from irrigation.models import IrrigationHistory, RainfallConfirmation
from master.models import CropType, SoilType, CropVariety, CropWaterRequirement
from master.services import calculate_expected_crop_stage


# ─── Default Crop Water Requirements & Growth Stage Coefficients ─────────────────────────────
# Base daily water requirement in Liters / m² / day under standard baseline weather (25°C, 65% RH, 10 km/h wind)
CROP_WATER_CONFIGS = {
    'rice': {'daily_req_l_m2': 6.0, 'kc': 1.10, 'min_req': 4.0, 'max_req': 9.0},
    'paddy': {'daily_req_l_m2': 6.0, 'kc': 1.10, 'min_req': 4.0, 'max_req': 9.0},
    'tomato': {'daily_req_l_m2': 4.0, 'kc': 1.05, 'min_req': 2.5, 'max_req': 6.0},
    'banana': {'daily_req_l_m2': 5.5, 'kc': 1.10, 'min_req': 3.5, 'max_req': 8.0},
    'coconut': {'daily_req_l_m2': 6.5, 'kc': 1.00, 'min_req': 4.0, 'max_req': 9.0},
    'vegetables': {'daily_req_l_m2': 4.0, 'kc': 0.95, 'min_req': 2.5, 'max_req': 5.5},
    'corn': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
    'maize': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
    'wheat': {'daily_req_l_m2': 3.8, 'kc': 0.95, 'min_req': 2.5, 'max_req': 5.5},
    'sugarcane': {'daily_req_l_m2': 6.5, 'kc': 1.15, 'min_req': 4.5, 'max_req': 9.5},
    'cotton': {'daily_req_l_m2': 4.8, 'kc': 1.00, 'min_req': 3.0, 'max_req': 7.0},
    'default': {'daily_req_l_m2': 4.5, 'kc': 1.00, 'min_req': 3.0, 'max_req': 6.5},
}

GROWTH_STAGE_FACTORS = {
    'germination': 0.70,
    'initial': 0.70,
    'vegetative': 1.00,
    'flowering': 1.15,
    'fruiting': 1.10,
    'harvesting': 0.75,
    'late': 0.75,
}

SOIL_RETENTION_FACTORS = {
    'clay': 0.70,      # Clay retains 70% carryover
    'loam': 0.50,      # Loam retains 50% carryover
    'loamy': 0.50,
    'sandy': 0.30,      # Sandy retains 30% carryover
    'sand': 0.30,
    'default': 0.50,
}


def calculate_crop_water_deficit(
    field=None,
    farm=None,
    weather_data=None,
    override_temp=None,
    override_humidity=None,
    override_wind=None,
    override_rain_forecast_mm=None,
    override_yesterday_irrigation_l=None,
):
    """
    Calculates scientific crop water requirement and water deficit (in Liters) for a field/farm.
    Utilizes PostgreSQL CropWaterRequirement database with multi-tier fallback to hardcoded default configs.
    """
    weather_data = weather_data or {}

    # Extract Crop Info
    crop_name = 'Paddy / Rice'
    crop_key = 'paddy'
    crop_stage_key = 'vegetative'
    soil_type_name = 'Loam'
    area_acres = 1.0
    crop_type_obj = None
    crop_variety_obj = None
    soil_type_obj = None

    if field:
        crop_type_obj = field.crop_type
        crop_variety_obj = getattr(field, 'crop_variety', None)
        soil_type_obj = field.soil_type

        if field.crop_type:
            crop_name = field.crop_type.name
            crop_key = field.crop_type.name.lower()
        if field.soil_type:
            soil_type_name = field.soil_type.name
        area_acres = float(field.area or 1.0)
        
        # Automated expected crop stage determination
        stage_calc_info = calculate_expected_crop_stage(
            crop_variety=crop_variety_obj,
            planting_date=field.planting_date,
            fallback_stage=field.crop_stage or 'vegetative'
        )
        crop_stage_key = (stage_calc_info['current_expected_stage'] or 'vegetative').lower()
    elif farm:
        area_acres = float(farm.total_area or 1.0)


    # Area Conversion: 1 acre = 4046.86 m²
    field_area_m2 = area_acres * 4046.86

    # Crop Baseline Config Lookup via PostgreSQL DB with Fallback Hierarchy
    db_water_req = None
    water_source_info = 'System Default Baseline'
    source_reference = None
    variety_name = crop_variety_obj.variety_name if crop_variety_obj else None

    if crop_type_obj:
        # Level 1: Crop + Variety + Stage + Soil
        if crop_variety_obj and soil_type_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj, crop_stage=crop_stage_key, soil_type=soil_type_obj
            ).first()

        # Level 2: Crop + Variety + Stage
        if not db_water_req and crop_variety_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj, crop_stage=crop_stage_key
            ).first()

        # Level 3: Crop + Variety
        if not db_water_req and crop_variety_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, variety=crop_variety_obj
            ).first()

        # Level 4: Crop + Stage + Soil
        if not db_water_req and soil_type_obj:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, crop_stage=crop_stage_key, soil_type=soil_type_obj
            ).first()

        # Level 5: Crop + Stage
        if not db_water_req:
            db_water_req = CropWaterRequirement.objects.filter(
                crop=crop_type_obj, crop_stage=crop_stage_key
            ).first()

        # Level 6: Crop General
        if not db_water_req:
            db_water_req = CropWaterRequirement.objects.filter(crop=crop_type_obj).first()

    # Determine Base Daily Req (L/m²/day) & Kc
    if db_water_req:
        base_daily_req_per_m2 = float(db_water_req.optimal_water)
        water_source_info = f"Database Baseline ({variety_name or db_water_req.crop.name})"
        source_reference = db_water_req.source_reference or "Agricultural Research Dataset"
        kc = 1.05 if 'tomato' in crop_key else (1.10 if 'rice' in crop_key or 'paddy' in crop_key else 1.00)
        min_req = float(db_water_req.min_water) if db_water_req.min_water else 2.5
        max_req = float(db_water_req.max_water) if db_water_req.max_water else 9.0
    else:
        crop_config = CROP_WATER_CONFIGS.get(crop_key, None)
        if not crop_config:
            for k, v in CROP_WATER_CONFIGS.items():
                if k in crop_key or crop_key in k:
                    crop_config = v
                    break
        if not crop_config:
            crop_config = CROP_WATER_CONFIGS['default']

        base_daily_req_per_m2 = crop_config['daily_req_l_m2']
        kc = crop_config.get('kc', 1.0)
        min_req = crop_config.get('min_req', 3.0)
        max_req = crop_config.get('max_req', 6.5)

    growth_multiplier = GROWTH_STAGE_FACTORS.get(crop_stage_key, 1.00)

    # Weather Parameters
    temp = float(override_temp if override_temp is not None else weather_data.get('temperature', 29.5))
    humidity = float(override_humidity if override_humidity is not None else weather_data.get('humidity', 70.0))
    wind_speed = float(override_wind if override_wind is not None else weather_data.get('wind_speed', 12.0))
    
    # Rain forecast (mm in next 24h)
    if override_rain_forecast_mm is not None:
        rain_forecast_mm = float(override_rain_forecast_mm)
    else:
        if 'rain_mm' in weather_data:
            rain_forecast_mm = float(weather_data['rain_mm'])
        elif 'forecast_rainfall_mm' in weather_data:
            rain_forecast_mm = float(weather_data['forecast_rainfall_mm'])
        else:
            rain_prob = float(weather_data.get('rain_probability', 0.0))
            if rain_prob >= 80:
                rain_forecast_mm = 20.0
            elif rain_prob >= 60:
                rain_forecast_mm = 10.0
            elif rain_prob >= 40:
                rain_forecast_mm = 3.0
            else:
                rain_forecast_mm = 0.0

    # Weather Multipliers
    if temp > 35:
        temp_mult = 1.25
    elif temp > 30:
        temp_mult = 1.12
    elif temp < 20:
        temp_mult = 0.85
    else:
        temp_mult = 1.00

    if humidity > 80:
        hum_mult = 0.85
    elif humidity < 45:
        hum_mult = 1.15
    else:
        hum_mult = 1.00

    if wind_speed > 20:
        wind_mult = 1.15
    else:
        wind_mult = 1.00

    # Calculate Adjusted ETc (L/m²/day)
    etc_l_per_m2 = base_daily_req_per_m2 * kc * growth_multiplier * temp_mult * hum_mult * wind_mult
    etc_l_per_m2 = max(min_req, min(max_req, etc_l_per_m2))

    # Today's Crop Water Demand in Liters
    today_crop_demand_liters = round(etc_l_per_m2 * field_area_m2)

    # Effective Rainfall Calculation
    rainfall_efficiency_factor = 0.70  # 70% of rainfall penetrates root zone
    effective_rainfall_mm = rain_forecast_mm * rainfall_efficiency_factor
    effective_rainfall_liters = round(effective_rainfall_mm * field_area_m2)

    # Today's Completed Irrigation & Yesterday's Carryover / Unmet Deficit
    completed_today_irrigation_liters = 0.0
    yesterday_irrigation_liters = 0.0

    if override_yesterday_irrigation_l is not None:
        yesterday_irrigation_liters = float(override_yesterday_irrigation_l)
    else:
        try:
            now = timezone.now()
            today_start = now - timedelta(hours=24)
            yesterday_start = now - timedelta(hours=48)

            if field:
                today_qs = IrrigationHistory.objects.filter(field=field, status='completed', irrigated_at__gte=today_start)
                yest_qs = IrrigationHistory.objects.filter(field=field, status='completed', irrigated_at__gte=yesterday_start, irrigated_at__lt=today_start)
            elif farm:
                today_qs = IrrigationHistory.objects.filter(field__farm=farm, status='completed', irrigated_at__gte=today_start)
                yest_qs = IrrigationHistory.objects.filter(field__farm=farm, status='completed', irrigated_at__gte=yesterday_start, irrigated_at__lt=today_start)
            else:
                today_qs = []
                yest_qs = []

            completed_today_irrigation_liters = float(sum(r.volume_litres for r in today_qs))
            yesterday_irrigation_liters = float(sum(r.volume_litres for r in yest_qs))
        except Exception:
            completed_today_irrigation_liters = 0.0
            yesterday_irrigation_liters = 0.0

    # Soil retention lookup
    soil_key = (soil_type_name or 'loam').lower()
    soil_retention_factor = SOIL_RETENTION_FACTORS['default']
    for k, v in SOIL_RETENTION_FACTORS.items():
        if k in soil_key:
            soil_retention_factor = v
            break

    # Yesterday's estimated baseline demand
    yesterday_demand_liters = today_crop_demand_liters

    useful_carryover_liters = 0.0
    previous_unmet_deficit_liters = 0.0

    if yesterday_irrigation_liters > yesterday_demand_liters:
        surplus = yesterday_irrigation_liters - yesterday_demand_liters
        useful_carryover_liters = round(surplus * soil_retention_factor)
    elif yesterday_irrigation_liters < yesterday_demand_liters and yesterday_irrigation_liters > 0:
        previous_unmet_deficit_liters = round(yesterday_demand_liters - yesterday_irrigation_liters)

    # Net Today Water Deficit Calculation
    raw_deficit = (
        today_crop_demand_liters
        + previous_unmet_deficit_liters
        - effective_rainfall_liters
        - useful_carryover_liters
        - completed_today_irrigation_liters
    )
    net_water_deficit_liters = max(0.0, raw_deficit)
    recommended_irrigation_liters = max(0, round(net_water_deficit_liters))

    # Priority Determination
    deficit_ratio = net_water_deficit_liters / max(1.0, today_crop_demand_liters)

    if recommended_irrigation_liters == 0 or deficit_ratio <= 0.15:
        irrigation_needed = False
        priority = "LOW"
        recommendation_title = "No Irrigation Needed"
    elif deficit_ratio < 0.60:
        irrigation_needed = True
        priority = "MEDIUM"
        recommendation_title = "Irrigation Needed"
    else:
        irrigation_needed = True
        priority = "HIGH"
        recommendation_title = "Irrigation Needed"

    # Dynamic Confidence Calculation (70% - 95%)
    confidence = 92
    missing_penalties = 0
    if not field or not field.crop_stage:
        missing_penalties += 5
    if not field or not field.soil_type:
        missing_penalties += 4
    if rain_forecast_mm == 0.0 and 'rain_probability' in weather_data:
        missing_penalties += 3
    confidence = max(70, 95 - missing_penalties)

    # Dynamic AI Explanation Construction
    explanation_parts = []
    variety_str = f" Variety: {variety_name}," if variety_name else ""
    explanation_parts.append(
        f"{crop_name}{variety_str} ({area_acres:.1f} acres, {crop_stage_key.title()} stage) has a daily water demand of {today_crop_demand_liters:,} Liters ({etc_l_per_m2:.1f} L/m²/day)."
    )

    if completed_today_irrigation_liters > 0:
        explanation_parts.append(
            f"Irrigation of {int(completed_today_irrigation_liters):,} L was completed today."
        )

    if previous_unmet_deficit_liters > 0:
        explanation_parts.append(
            f"Previous irrigation was insufficient by {previous_unmet_deficit_liters:,} L, carrying over an unmet deficit."
        )
    elif useful_carryover_liters > 0:
        explanation_parts.append(
            f"Previous irrigation provided a surplus of {useful_carryover_liters:,} L usable soil moisture."
        )

    if effective_rainfall_liters > 0:
        explanation_parts.append(
            f"Expected effective rainfall ({rain_forecast_mm:.1f} mm) will provide {effective_rainfall_liters:,} L."
        )

    if irrigation_needed:
        explanation_parts.append(
            f"Net water deficit is {int(net_water_deficit_liters):,} L. Irrigation is recommended ({priority} Priority)."
        )
    else:
        explanation_parts.append(
            "Current soil moisture, recent completed irrigation, and forecast rainfall are sufficient to meet crop demands. No immediate irrigation required."
        )

    explanation = " ".join(explanation_parts)

    return {
        'irrigation_needed': irrigation_needed,
        'recommendation': recommendation_title,
        'priority': priority,
        'recommended_water_liters': recommended_irrigation_liters,
        'crop_name': crop_name,
        'crop_variety_name': variety_name,
        'crop_stage': crop_stage_key.title(),
        'days_after_planting': stage_calc_info['days_after_planting'] if stage_calc_info else None,
        'next_expected_stage': stage_calc_info['next_expected_stage_display'] if stage_calc_info else None,
        'days_until_next_stage': stage_calc_info['days_until_next_stage'] if stage_calc_info else None,
        'stage_source_reference': stage_calc_info['source_reference'] if stage_calc_info else None,
        'soil_type': soil_type_name,
        'area_acres': area_acres,
        'field_area_m2': round(field_area_m2, 1),
        'base_daily_req_per_m2': base_daily_req_per_m2,
        'water_source_info': water_source_info,
        'source_reference': source_reference,
        'today_crop_demand_liters': today_crop_demand_liters,
        'previous_unmet_deficit_liters': previous_unmet_deficit_liters,
        'useful_carryover_liters': useful_carryover_liters,
        'forecast_rainfall_mm': round(rain_forecast_mm, 1),
        'effective_rainfall_liters': effective_rainfall_liters,
        'net_water_deficit_liters': round(net_water_deficit_liters),
        'completed_today_irrigation_liters': round(completed_today_irrigation_liters),
        'yesterday_irrigation_liters': round(yesterday_irrigation_liters),
        'recent_irrigation_liters': round(completed_today_irrigation_liters + yesterday_irrigation_liters),
        'confidence': confidence,
        'reason': explanation,
        'weather_snapshot': {
            'temperature': temp,
            'humidity': humidity,
            'wind_speed': wind_speed,
            'rain_forecast_mm': rain_forecast_mm,
        }
    }

