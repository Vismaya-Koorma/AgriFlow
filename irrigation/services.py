import math
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from irrigation.models import IrrigationHistory, RainfallConfirmation

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

    Formula:
    1. Base Crop Demand (L/m²/day) = crop_daily_req * Kc * GrowthStageMultiplier
    2. Weather Adjusted ETc (L/m²/day) = Base * Temp_Factor * Humidity_Factor * Wind_Factor
    3. Today's Crop Water Demand (L) = ETc * Field_Area_m²
    4. Effective Rainfall Water (L) = (Forecast_Rain_mm * Rainfall_Efficiency) * Field_Area_m²
    5. Yesterday Water Balance:
       - Carryover Water (L) = max(0, Yesterday_Irrigation - Yesterday_Demand) * Soil_Retention
       - Unmet Previous Deficit (L) = max(0, Yesterday_Demand - Yesterday_Irrigation)
    6. Today's Net Water Deficit (L) = Today_Demand + Unmet_Previous_Deficit - Effective_Rain_Water - Carryover_Water
    7. Recommended Irrigation (L) = max(0, round(Net_Water_Deficit))
    """
    weather_data = weather_data or {}

    # Extract Crop Info
    crop_name = 'Paddy / Rice'
    crop_key = 'paddy'
    crop_stage_key = 'vegetative'
    soil_type_name = 'Loam'
    area_acres = 1.0

    if field:
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

    # Crop Baseline Config Lookup
    crop_config = CROP_WATER_CONFIGS.get(crop_key, None)
    if not crop_config:
        # Match substring
        for k, v in CROP_WATER_CONFIGS.items():
            if k in crop_key or crop_key in k:
                crop_config = v
                break
    if not crop_config:
        crop_config = CROP_WATER_CONFIGS['default']

    base_daily_req_per_m2 = crop_config['daily_req_l_m2']
    kc = crop_config['kc']
    growth_multiplier = GROWTH_STAGE_FACTORS.get(crop_stage_key, 1.00)

    # Weather Parameters
    temp = float(override_temp if override_temp is not None else weather_data.get('temperature', 29.5))
    humidity = float(override_humidity if override_humidity is not None else weather_data.get('humidity', 70.0))
    wind_speed = float(override_wind if override_wind is not None else weather_data.get('wind_speed', 12.0))
    
    # Rain forecast (mm in next 24h)
    if override_rain_forecast_mm is not None:
        rain_forecast_mm = float(override_rain_forecast_mm)
    else:
        # If forecast_mm is provided directly or convert rain probability to estimated mm
        if 'rain_mm' in weather_data:
            rain_forecast_mm = float(weather_data['rain_mm'])
        elif 'forecast_rainfall_mm' in weather_data:
            rain_forecast_mm = float(weather_data['forecast_rainfall_mm'])
        else:
            rain_prob = float(weather_data.get('rain_probability', 0.0))
            # If rain probability > 60%, estimate mm proportionately (e.g. 80% prob = ~12mm)
            if rain_prob >= 80:
                rain_forecast_mm = 20.0
            elif rain_prob >= 60:
                rain_forecast_mm = 10.0
            elif rain_prob >= 40:
                rain_forecast_mm = 3.0
            else:
                rain_forecast_mm = 0.0

    # Weather Multipliers
    # Temperature adjustment: >35°C (+25%), >30°C (+12%), <20°C (-15%)
    if temp > 35:
        temp_mult = 1.25
    elif temp > 30:
        temp_mult = 1.12
    elif temp < 20:
        temp_mult = 0.85
    else:
        temp_mult = 1.00

    # Humidity adjustment: >80% (reduces ETc to 0.85), <45% (increases ETc to 1.15)
    # NOTE: High humidity reduces transpiration slightly but NEVER sets requirement to zero!
    if humidity > 80:
        hum_mult = 0.85
    elif humidity < 45:
        hum_mult = 1.15
    else:
        hum_mult = 1.00

    # Wind adjustment: >20 km/h (+15%)
    if wind_speed > 20:
        wind_mult = 1.15
    else:
        wind_mult = 1.00

    # Calculate Adjusted ETc (L/m²/day)
    etc_l_per_m2 = base_daily_req_per_m2 * kc * growth_multiplier * temp_mult * hum_mult * wind_mult
    # Clamp to min/max thresholds for safety
    etc_l_per_m2 = max(crop_config['min_req'], min(crop_config['max_req'], etc_l_per_m2))

    # Today's Crop Water Demand in Liters
    today_crop_demand_liters = round(etc_l_per_m2 * field_area_m2)

    # Effective Rainfall Calculation
    rainfall_efficiency_factor = 0.70  # 70% of rainfall penetrates root zone
    effective_rainfall_mm = rain_forecast_mm * rainfall_efficiency_factor
    effective_rainfall_liters = round(effective_rainfall_mm * field_area_m2)

    # Yesterday's Irrigation & Carryover / Unmet Deficit
    if override_yesterday_irrigation_l is not None:
        yesterday_irrigation_liters = float(override_yesterday_irrigation_l)
    else:
        yesterday_irrigation_liters = 0.0
        try:
            yesterday_start = timezone.now() - timedelta(hours=36)
            if field:
                records = IrrigationHistory.objects.filter(field=field, irrigated_at__gte=yesterday_start)
            elif farm:
                records = IrrigationHistory.objects.filter(field__farm=farm, irrigated_at__gte=yesterday_start)
            else:
                records = []
            yesterday_irrigation_liters = float(sum(r.volume_litres for r in records))
        except Exception:
            yesterday_irrigation_liters = 0.0

    # Soil retention lookup
    soil_key = (soil_type_name or 'loam').lower()
    soil_retention_factor = SOIL_RETENTION_FACTORS['default']
    for k, v in SOIL_RETENTION_FACTORS.items():
        if k in soil_key:
            soil_retention_factor = v
            break

    # Yesterday's estimated baseline demand
    yesterday_demand_liters = today_crop_demand_liters  # assume similar conditions

    useful_carryover_liters = 0.0
    previous_unmet_deficit_liters = 0.0

    if yesterday_irrigation_liters > yesterday_demand_liters:
        surplus = yesterday_irrigation_liters - yesterday_demand_liters
        useful_carryover_liters = round(surplus * soil_retention_factor)
    elif yesterday_irrigation_liters < yesterday_demand_liters:
        previous_unmet_deficit_liters = round(yesterday_demand_liters - yesterday_irrigation_liters)

    # Net Today Water Deficit Calculation
    net_water_deficit_liters = (
        today_crop_demand_liters
        + previous_unmet_deficit_liters
        - effective_rainfall_liters
        - useful_carryover_liters
    )

    recommended_irrigation_liters = max(0, round(net_water_deficit_liters))

    # Priority Determination
    # Deficit Ratio = Net Deficit / Today's Demand
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
    explanation_parts.append(
        f"{crop_name} ({area_acres:.1f} acres, {crop_stage_key.title()} stage) has a daily water demand of {today_crop_demand_liters:,} Liters ({etc_l_per_m2:.1f} L/m²/day)."
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
    else:
        explanation_parts.append("No significant effective rainfall is expected.")

    if irrigation_needed:
        explanation_parts.append(
            f"Net water deficit is {net_water_deficit_liters:,} L. Irrigation is recommended ({priority} Priority)."
        )
    else:
        explanation_parts.append(
            "Current soil moisture and forecast rainfall are sufficient to meet crop demands. No immediate irrigation required."
        )

    explanation = " ".join(explanation_parts)

    return {
        'irrigation_needed': irrigation_needed,
        'recommendation': recommendation_title,
        'priority': priority,
        'recommended_water_liters': recommended_irrigation_liters,
        'crop_name': crop_name,
        'crop_stage': crop_stage_key.title(),
        'soil_type': soil_type_name,
        'area_acres': area_acres,
        'field_area_m2': round(field_area_m2, 1),
        'today_crop_demand_liters': today_crop_demand_liters,
        'previous_unmet_deficit_liters': previous_unmet_deficit_liters,
        'useful_carryover_liters': useful_carryover_liters,
        'forecast_rainfall_mm': round(rain_forecast_mm, 1),
        'effective_rainfall_liters': effective_rainfall_liters,
        'net_water_deficit_liters': round(net_water_deficit_liters),
        'yesterday_irrigation_liters': round(yesterday_irrigation_liters),
        'confidence': confidence,
        'reason': explanation,
        'weather_snapshot': {
            'temperature': temp,
            'humidity': humidity,
            'wind_speed': wind_speed,
            'rain_forecast_mm': rain_forecast_mm,
        }
    }
