from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from farms.models import Field, Farm
from irrigation.models import WaterSource, IrrigationHistory, RainfallConfirmation
from recommendation.views import estimate_moisture_status, predict_crop_stress, calculate_water_requirement


HIGH_VALUE_CROPS = ['tomato', 'banana', 'coconut', 'sugarcane', 'paddy', 'rice', 'potato', 'cotton']


def get_total_available_water():
    """Sum available water from all active WaterSource records or fallback calculation."""
    sources = WaterSource.objects.filter(is_active=True)
    if sources.exists():
        total = sum(s.available_liters for s in sources)
        if total > 0:
            return round(total, 2)

    # Fallback if no active water source recorded: calculate default base reserve
    active_fields_count = Field.objects.filter(is_active=True).count()
    return float(max(50000, active_fields_count * 10000))


def calculate_field_priority(field, temperature=30.0, humidity=65.0):
    """
    Calculate transparent Field Priority Score (0-100) based on:
    - Crop stress risk & score
    - Soil moisture status
    - Growth stage sensitivity
    - Days since last irrigation
    - Expected rainfall
    - Crop economic value / importance
    - Water requirement & field area
    """
    crop_name = field.crop_type.name if field.crop_type else 'General Crop'
    soil_name = field.soil_type.name if field.soil_type else 'Loamy Soil'
    crop_stage = field.crop_stage or 'vegetative'
    area_acres = float(field.area or 1.0)
    farmer_name = field.farm.user.full_name or field.farm.user.username if field.farm and field.farm.user else 'Farmer'

    # Days since last irrigation
    last_irrigation = IrrigationHistory.objects.filter(field=field).order_by('-irrigated_at').first()
    if last_irrigation:
        days_since_irrigation = (timezone.now() - last_irrigation.irrigated_at).days
    else:
        days_since_irrigation = 5

    # Expected rainfall
    latest_rain = RainfallConfirmation.objects.filter(field=field).order_by('-confirmed_at').first()
    rainfall_mm = float(latest_rain.rainfall_mm or 0) if latest_rain else 0.0

    # Moisture status & Crop stress
    moisture_status = estimate_moisture_status(temperature, humidity, rainfall_mm, soil_name, days_since_irrigation)
    risk_level, stress_score, factors, stress_reason = predict_crop_stress(
        temperature, humidity, rainfall_mm, moisture_status, days_since_irrigation, crop_stage, crop_name
    )

    # Estimated water requirement (litres)
    water_req_liters = calculate_water_requirement(
        crop_name, area_acres, crop_stage, soil_name, temperature, rainfall_mm
    )

    # Transparent Priority Calculation Formula
    contributing_factors = []
    score = 0.0

    # Factor 1: Crop Stress Score (max ~35 pts)
    stress_pts = (stress_score / 100.0) * 35.0
    score += stress_pts
    contributing_factors.append({
        'factor': 'Crop Stress Risk',
        'points': round(stress_pts, 1),
        'detail': f"{risk_level.upper()} risk (Stress Score: {stress_score}/100)"
    })

    # Factor 2: Soil Moisture Status (max 25 pts)
    if moisture_status == 'dry':
        moisture_pts = 25.0
    elif moisture_status == 'moderate':
        moisture_pts = 10.0
    else:
        moisture_pts = 0.0
    score += moisture_pts
    contributing_factors.append({
        'factor': 'Soil Moisture',
        'points': moisture_pts,
        'detail': f"Estimated {moisture_status.upper()} soil condition"
    })

    # Factor 3: Days Since Last Irrigation (max 25 pts)
    irrigation_pts = min(days_since_irrigation * 3.5, 25.0)
    score += irrigation_pts
    contributing_factors.append({
        'factor': 'Irrigation Gap',
        'points': round(irrigation_pts, 1),
        'detail': f"{days_since_irrigation} days since last irrigation"
    })

    # Factor 4: Growth Stage Sensitivity (max 15 pts)
    if crop_stage in ['flowering', 'fruiting']:
        stage_pts = 15.0
    elif crop_stage in ['vegetative', 'germination']:
        stage_pts = 5.0
    else:
        stage_pts = 0.0
    score += stage_pts
    contributing_factors.append({
        'factor': 'Growth Stage Sensitivity',
        'points': stage_pts,
        'detail': f"{crop_stage.title()} stage (critical water need)"
    })

    # Factor 5: Crop Economic Importance (max 10 pts)
    is_high_value = any(k in crop_name.lower() for k in HIGH_VALUE_CROPS)
    crop_pts = 10.0 if is_high_value else 5.0
    score += crop_pts
    contributing_factors.append({
        'factor': 'Crop Importance',
        'points': crop_pts,
        'detail': f"{crop_name} ({'High-value' if is_high_value else 'Standard'} crop)"
    })

    # Factor 6: Expected Rainfall Deduction (up to -15 pts)
    if rainfall_mm >= 15:
        rain_pts = -15.0
    elif rainfall_mm >= 5:
        rain_pts = -5.0
    else:
        rain_pts = 0.0
    score += rain_pts
    if rain_pts != 0:
        contributing_factors.append({
            'factor': 'Expected Rainfall Relief',
            'points': rain_pts,
            'detail': f"{rainfall_mm}mm expected rain reduces urgency"
        })

    final_score = max(0, min(100, round(score)))

    # Priority Level
    if final_score >= 70:
        priority_level = 'HIGH'
    elif final_score >= 40:
        priority_level = 'MEDIUM'
    else:
        priority_level = 'LOW'

    # Human-Readable Explanation
    explanation_parts = []
    if moisture_status == 'dry':
        explanation_parts.append(f"the soil is estimated DRY")
    if crop_stage in ['flowering', 'fruiting']:
        explanation_parts.append(f"the {crop_name} crop is in sensitive {crop_stage.title()} stage")
    if risk_level in ['high', 'critical']:
        explanation_parts.append(f"crop stress risk is {risk_level.upper()}")
    if days_since_irrigation >= 4:
        explanation_parts.append(f"{days_since_irrigation} days have elapsed since last irrigation")
    if rainfall_mm == 0:
        explanation_parts.append("no significant rainfall is expected")
    elif rainfall_mm > 0:
        explanation_parts.append(f"{rainfall_mm}mm rainfall expected")

    reason_str = f"Field '{field.name}' assigned {priority_level} priority (Score: {final_score}/100) because " + ", ".join(explanation_parts) + "."

    return {
        'field_id': field.id,
        'field_name': field.name,
        'farm_id': field.farm.id if field.farm else None,
        'farm_name': field.farm.name if field.farm else 'N/A',
        'farmer_name': farmer_name,
        'crop_type': crop_name,
        'crop_stage': crop_stage,
        'soil_type': soil_name,
        'area_acres': area_acres,
        'days_since_irrigation': days_since_irrigation,
        'moisture_status': moisture_status,
        'stress_risk_level': risk_level,
        'stress_score': stress_score,
        'rainfall_mm': rainfall_mm,
        'priority_score': final_score,
        'priority_level': priority_level,
        'water_requirement_liters': water_req_liters,
        'contributing_factors': contributing_factors,
        'explanation': reason_str
    }


def optimize_water_allocation(fields_priority_list, total_available_water):
    """
    Allocate water based on descending Field Priority Scores.
    Returns:
    - field_allocations list
    - total_requested_water
    - total_allocated_water
    - water_deficit_surplus
    - utilization_percentage
    - fields_summary (counts by status & priority)
    """
    sorted_fields = sorted(fields_priority_list, key=lambda x: x['priority_score'], reverse=True)
    remaining_water = float(total_available_water)

    total_requested = sum(f['water_requirement_liters'] for f in sorted_fields)
    total_allocated = 0.0

    allocations = []
    full_count = 0
    partial_count = 0
    zero_count = 0

    for item in sorted_fields:
        req = float(item['water_requirement_liters'])
        if remaining_water >= req:
            allocated = req
            status = 'FULL'
            reason = f"Full allocation ({int(allocated):,} L) provided based on {item['priority_level']} priority score ({item['priority_score']}/100)."
            full_count += 1
        elif remaining_water > 0:
            allocated = remaining_water
            status = 'PARTIAL'
            reason = f"Partial allocation ({int(allocated):,} L of {int(req):,} L requested) due to available water limitation."
            partial_count += 1
        else:
            allocated = 0.0
            status = 'NONE'
            reason = f"No water allocated due to severe supply deficit. Field at high risk."
            zero_count += 1

        remaining_water -= allocated
        total_allocated += allocated

        alloc_item = dict(item)
        alloc_item['recommended_water_liters'] = round(allocated)
        alloc_item['allocation_status'] = status
        alloc_item['allocation_reason'] = reason
        allocations.append(alloc_item)

    deficit_surplus = total_available_water - total_requested
    utilization_pct = round((total_allocated / total_available_water) * 100, 1) if total_available_water > 0 else 0.0

    return {
        'allocations': allocations,
        'total_available_water': round(total_available_water),
        'total_requested_water': round(total_requested),
        'total_allocated_water': round(total_allocated),
        'water_deficit_surplus': round(deficit_surplus),
        'utilization_percentage': utilization_pct,
        'summary_counts': {
            'total_fields': len(sorted_fields),
            'fields_full': full_count,
            'fields_partial': partial_count,
            'fields_zero': zero_count,
            'high_priority_count': sum(1 for f in sorted_fields if f['priority_level'] == 'HIGH'),
            'medium_priority_count': sum(1 for f in sorted_fields if f['priority_level'] == 'MEDIUM'),
            'low_priority_count': sum(1 for f in sorted_fields if f['priority_level'] == 'LOW'),
        }
    }


def generate_action_plan(current_alloc_data, simulated_alloc_data=None, is_simulation=False):
    """Generate structured Agricultural Action Plan items."""
    allocs = simulated_alloc_data['allocations'] if simulated_alloc_data else current_alloc_data['allocations']
    actions = []

    # Action 1: Top priority field allocation
    high_prio_fields = [f for f in allocs if f['priority_level'] == 'HIGH']
    if high_prio_fields:
        top = high_prio_fields[0]
        actions.append({
            'step': 1,
            'category': 'Immediate Priority',
            'action': f"Prioritize Field '{top['field_name']}' ({top['crop_type']})",
            'detail': f"Allocate {top['recommended_water_liters']:,} L immediately. Priority score: {top['priority_score']}/100 ({top['crop_stage'].title()} stage).",
            'badge': 'CRITICAL'
        })

    # Action 2: Partial or zero water field management
    partial_or_zero = [f for f in allocs if f['allocation_status'] in ['PARTIAL', 'NONE']]
    if partial_or_zero:
        target = partial_or_zero[0]
        actions.append({
            'step': 2,
            'category': 'Deficit Management',
            'action': f"Apply water conservation strategy on '{target['field_name']}' ({target['crop_type']})",
            'detail': f"Field is receiving {target['allocation_status'].lower()} allocation ({target['recommended_water_liters']:,} L of {target['water_requirement_liters']:,} L needed). Utilize drip irrigation.",
            'badge': 'WARNING'
        })

    # Action 3: Expected rainfall delay recommendation
    rain_fields = [f for f in allocs if f['rainfall_mm'] >= 10]
    if rain_fields:
        r_field = rain_fields[0]
        actions.append({
            'step': 3,
            'category': 'Rainfall Synchronization',
            'action': f"Delay irrigation for '{r_field['field_name']}' ({r_field['crop_type']})",
            'detail': f"Expected natural rainfall ({r_field['rainfall_mm']}mm) will meet crop requirement. Save water reserve.",
            'badge': 'INFO'
        })
    else:
        actions.append({
            'step': 3,
            'category': 'Weather Alignment',
            'action': "No immediate heavy rainfall expected across fields",
            'detail': "Rely on scheduled irrigation distribution as forecast indicates dry weather.",
            'badge': 'INFO'
        })

    # Action 4: Stress Risk Monitoring
    dry_fields = [f for f in allocs if f['moisture_status'] == 'dry']
    if dry_fields:
        d_field = dry_fields[0]
        actions.append({
            'step': 4,
            'category': 'Crop Stress Alert',
            'action': f"Monitor Field '{d_field['field_name']}' for drought stress",
            'detail': f"Soil condition is DRY and crop stress score is {d_field['stress_score']}/100. Re-evaluate if temperature rises.",
            'badge': 'WARNING'
        })

    # Action 5: Reservoir / Source Recheck
    actions.append({
        'step': 5,
        'category': 'System Re-evaluation',
        'action': "Recheck regional water source levels after completing priority cycle",
        'detail': "Monitor storage reserves and adjust next cycle allocation accordingly.",
        'badge': 'SUCCESS'
    })

    return actions


def run_what_if_simulation(user=None, reduction_percentage=None, custom_water_liters=None, fields_list=None):
    """
    Run What-If Simulation on in-memory dataset without altering database records.
    Returns:
    - current_scenario (actual allocation)
    - simulated_scenario (simulated allocation)
    - impact_analysis
    - action_plan
    """
    if fields_list is None:
        active_fields = Field.objects.filter(is_active=True).select_related('crop_type', 'soil_type', 'farm', 'farm__user')
        fields_list = [calculate_field_priority(f) for f in active_fields]

    current_available_water = get_total_available_water()

    # Determine simulated available water
    if reduction_percentage is not None:
        pct = float(reduction_percentage)
        simulated_available_water = max(0.0, current_available_water * (1.0 - (pct / 100.0)))
    elif custom_water_liters is not None:
        simulated_available_water = float(custom_water_liters)
        if current_available_water > 0:
            pct = round(max(0.0, ((current_available_water - simulated_available_water) / current_available_water) * 100.0), 1)
        else:
            pct = 0.0
    else:
        pct = 30.0
        simulated_available_water = current_available_water * 0.70

    current_result = optimize_water_allocation(fields_list, current_available_water)
    simulated_result = optimize_water_allocation(fields_list, simulated_available_water)

    # Impact Analysis
    current_counts = current_result['summary_counts']
    sim_counts = simulated_result['summary_counts']

    # Identify major affected field (field with highest priority score that lost full allocation)
    major_affected = None
    for c_alloc, s_alloc in zip(current_result['allocations'], simulated_result['allocations']):
        if c_alloc['allocation_status'] == 'FULL' and s_alloc['allocation_status'] != 'FULL':
            major_affected = s_alloc
            break
    if not major_affected and simulated_result['allocations']:
        major_affected = simulated_result['allocations'][0]

    major_affected_name = f"{major_affected['field_name']} ({major_affected['crop_type']})" if major_affected else "None"

    impact_summary = (
        f"A {pct:.1f}% reduction in available water ({current_available_water:,.0f} L → {simulated_available_water:,.0f} L) "
        f"reduces fully irrigated fields from {current_counts['fields_full']} to {sim_counts['fields_full']}. "
        f"{sim_counts['fields_partial']} fields will receive partial water and {sim_counts['fields_zero']} fields are at risk."
    )

    impact_analysis = {
        'reduction_percentage': pct,
        'current_available_water': round(current_available_water),
        'simulated_available_water': round(simulated_available_water),
        'water_difference': round(simulated_available_water - current_available_water),
        'current_full_fields': current_counts['fields_full'],
        'simulated_full_fields': sim_counts['fields_full'],
        'current_partial_fields': current_counts['fields_partial'],
        'simulated_partial_fields': sim_counts['fields_partial'],
        'current_zero_fields': current_counts['fields_zero'],
        'simulated_zero_fields': sim_counts['fields_zero'],
        'additional_fields_at_risk': max(0, sim_counts['fields_zero'] - current_counts['fields_zero']),
        'major_affected_field': major_affected_name,
        'impact_summary': impact_summary
    }

    action_plan = generate_action_plan(current_result, simulated_result, is_simulation=True)

    return {
        'is_simulation': True,
        'current_scenario': current_result,
        'simulated_scenario': simulated_result,
        'impact_analysis': impact_analysis,
        'action_plan': action_plan
    }
