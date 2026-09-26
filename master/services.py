from datetime import date, datetime
from django.utils import timezone

class StageDurationMock:
    def __init__(self, stage, display, start_day, end_day, ref):
        self.stage = stage
        self._display = display
        self.start_day = start_day
        self.end_day = end_day
        self.source_reference = ref

    def get_stage_display(self):
        return self._display


DEFAULT_STAGE_DURATIONS = [
    StageDurationMock('germination', 'Germination', 0, 15, 'General Agricultural Growth Stage Baseline'),
    StageDurationMock('vegetative', 'Vegetative', 16, 45, 'General Agricultural Growth Stage Baseline'),
    StageDurationMock('flowering', 'Flowering', 46, 75, 'General Agricultural Growth Stage Baseline'),
    StageDurationMock('fruiting', 'Fruiting', 76, 110, 'General Agricultural Growth Stage Baseline'),
    StageDurationMock('harvesting', 'Harvesting', 111, None, 'General Agricultural Growth Stage Baseline'),
]


def calculate_expected_crop_stage(crop_variety=None, planting_date=None, target_date=None, fallback_stage=None, crop_type=None):
    """
    Calculates the expected current crop stage based on planting date, target date,
    and database-stored CropVarietyStageDuration records. Falls back gracefully to
    crop type or baseline growth stage day ranges when variety data is missing.
    """
    if not planting_date:
        if fallback_stage:
            fallback_display = str(fallback_stage).replace('_', ' ').title()
            return {
                'days_after_planting': None,
                'current_expected_stage': str(fallback_stage).lower(),
                'current_expected_stage_display': fallback_display,
                'next_expected_stage': None,
                'next_expected_stage_display': None,
                'days_until_next_stage': None,
                'source_reference': 'Fallback Stage',
                'has_stage_data': False,
                'status': 'fallback_stage_provided',
                'message': f"Using fallback stage: {fallback_display}"
            }
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
            'next_expected_stage': 'vegetative',
            'next_expected_stage_display': 'Vegetative',
            'days_until_next_stage': (target_date - planting_date).days + 15,
            'source_reference': '',
            'has_stage_data': False,
            'status': 'future_planting_date',
            'message': 'Planting date is in the future'
        }

    days_after_planting = (target_date - planting_date).days

    # Determine stage durations to use (Variety-specific -> CropType-specific -> General Baseline)
    stage_durations = []
    if crop_variety and hasattr(crop_variety, 'stage_durations'):
        stage_durations = list(crop_variety.stage_durations.order_by('start_day'))

    # If no stage durations for variety, check if crop_type can provide stage durations from another variety
    if not stage_durations:
        resolved_crop_type = crop_type or (crop_variety.crop if crop_variety else None)
        if resolved_crop_type:
            from master.models import CropVarietyStageDuration
            type_sd_qs = CropVarietyStageDuration.objects.filter(crop_variety__crop=resolved_crop_type).order_by('start_day')
            if type_sd_qs.exists():
                first_var = type_sd_qs.first().crop_variety
                stage_durations = list(first_var.stage_durations.order_by('start_day'))

    # If still no stage durations, fall back to sensible general growth-stage day ranges
    if not stage_durations:
        stage_durations = DEFAULT_STAGE_DURATIONS

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

    days_until_next = None
    if current_duration and current_duration.end_day is not None:
        days_until_next = max(0, (current_duration.end_day + 1) - days_after_planting)

    next_stage_display = next_duration.get_stage_display() if next_duration else None

    return {
        'days_after_planting': days_after_planting,
        'current_expected_stage': current_duration.stage if current_duration else 'germination',
        'current_expected_stage_display': current_duration.get_stage_display() if current_duration else 'Germination',
        'next_expected_stage': next_duration.stage if next_duration else None,
        'next_expected_stage_display': next_stage_display,
        'days_until_next_stage': days_until_next,
        'source_reference': getattr(current_duration, 'source_reference', ''),
        'has_stage_data': True,
        'status': 'success',
        'message': f"Expected current stage: {current_duration.get_stage_display() if current_duration else 'Germination'}"
    }


