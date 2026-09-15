from datetime import date, datetime
from django.utils import timezone

def calculate_expected_crop_stage(crop_variety, planting_date, target_date=None, fallback_stage=None):
    """
    Calculates the expected current crop stage based on planting date, target date,
    and database-stored CropVarietyStageDuration records.
    """
    if not planting_date:
        return {
            'days_after_planting': None,
            'current_expected_stage': None,
            'current_expected_stage_display': 'Planting Date Required',
            'next_expected_stage': None,
            'next_expected_stage_display': None,
            'days_until_next_stage': None,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'no_planting_date',
            'message': 'No planting date provided'
        }

    if target_date is None:
        target_date = timezone.now().date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()

    if planting_date > target_date:
        return {
            'days_after_planting': 0,
            'current_expected_stage': 'germination',
            'current_expected_stage_display': 'Germination',
            'next_expected_stage': None,
            'next_expected_stage_display': None,
            'days_until_next_stage': None,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'future_planting_date',
            'message': 'Planting date is in the future'
        }

    days_after_planting = (target_date - planting_date).days

    if not crop_variety:
        return {
            'days_after_planting': days_after_planting,
            'current_expected_stage': None,
            'current_expected_stage_display': 'Variety Required',
            'next_expected_stage': None,
            'next_expected_stage_display': None,
            'days_until_next_stage': None,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'no_variety',
            'message': 'No variety selected for variety-specific stage calculation'
        }

    stage_durations = list(crop_variety.stage_durations.order_by('start_day'))
    if not stage_durations:
        return {
            'days_after_planting': days_after_planting,
            'current_expected_stage': None,
            'current_expected_stage_display': 'Stage Info Incomplete',
            'next_expected_stage': None,
            'next_expected_stage_display': None,
            'days_until_next_stage': None,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'no_duration_data',
            'message': f"Stage information is not configured for {crop_variety.variety_name}."
        }

    current_duration = None
    next_duration = None

    for idx, sd in enumerate(stage_durations):
        is_start_valid = days_after_planting >= sd.start_day
        is_end_valid = (sd.end_day is None) or (days_after_planting <= sd.end_day)

        if is_start_valid and is_end_valid:
            current_duration = sd
            if idx + 1 < len(stage_durations):
                next_duration = stage_durations[idx + 1]
            break

    # Handle out of bounds
    if not current_duration:
        last_sd = stage_durations[-1]
        if last_sd.end_day and days_after_planting > last_sd.end_day:
            current_duration = last_sd
            next_duration = None
        elif days_after_planting < stage_durations[0].start_day:
            current_duration = stage_durations[0]
            next_duration = stage_durations[1] if len(stage_durations) > 1 else None

    if not current_duration:
        return {
            'days_after_planting': days_after_planting,
            'current_expected_stage': None,
            'current_expected_stage_display': 'Out of Range',
            'next_expected_stage': None,
            'next_expected_stage_display': None,
            'days_until_next_stage': None,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'out_of_range',
            'message': 'Days after planting outside configured stage ranges'
        }

    days_until_next = None
    if current_duration.end_day is not None:
        days_until_next = max(0, (current_duration.end_day + 1) - days_after_planting)

    next_stage_display = next_duration.get_stage_display() if next_duration else None

    return {
        'days_after_planting': days_after_planting,
        'current_expected_stage': current_duration.stage,
        'current_expected_stage_display': current_duration.get_stage_display(),
        'next_expected_stage': next_duration.stage if next_duration else None,
        'next_expected_stage_display': next_stage_display,
        'days_until_next_stage': days_until_next,
        'source_reference': current_duration.source_reference,
        'has_stage_data': True,
        'status': 'success',
        'message': f"Expected current stage: {current_duration.get_stage_display()}"
    }

