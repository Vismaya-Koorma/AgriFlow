import logging
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import (
    Field, Farm, FieldInspectionCriterion, FieldInspection,
    FieldCriterionResult, FieldCorrectiveAction, FieldVerificationHistory
)
from alerts.models import Alert

logger = logging.getLogger(__name__)


def is_supervisor_assigned_to_field(user, field):
    """
    Checks whether a user has authority to verify/reject the given field:
    - Exclusively designated for Field Supervisors.
    - Non-supervisors (admin, manager, farmer, maintenance) cannot perform field inspections.
    """
    if not user or not user.is_authenticated:
        return False
    return getattr(user, 'role', '').lower() == 'supervisor'


def ensure_default_inspection_criteria():
    if FieldInspectionCriterion.objects.filter(is_active=True).exists():
        return
    defaults = [
        ('crop_health', 'Plant Canopy Vigour & Uniformity', 'Assess vegetative vigour, foliage density, leaf coloration, and stand uniformity across the field plot.', True, False, 1),
        ('crop_health', 'Vegetative / Reproductive Stage Alignment', 'Verify actual physiological crop stage matches expected crop variety growth duration baseline.', True, False, 2),
        ('irrigation_water', 'Water Source Adequacy & Supply Reliability', 'Check operational availability of water source (canal branch, borewell, or storage pond) and delivery capacity.', True, True, 3),
        ('irrigation_water', 'Irrigation Distribution & Moisture Uniformity', 'Assess whether water is evenly distributed across rows without severe dry patches or unintended runoff.', True, False, 4),
        ('soil_drainage', 'Soil Drainage & Absence of Severe Waterlogging', 'Ensure field plot has adequate drainage slope and channels; absence of prolonged root zone inundation.', True, True, 5),
        ('soil_drainage', 'Soil Tilth, Structure & Root Zone Health', 'Evaluate soil structure, aeration, and absence of severe soil compaction or crusting.', True, False, 6),
        ('pest_disease', 'Absence of Quarantine / Severe Pathogen Outbreak', 'Inspect field for destructive quarantine pests or critical unchecked fungal/bacterial leaf blight epidemics.', True, True, 7),
        ('pest_disease', 'Pest Infestation Below Economic Injury Level', 'Verify scouting practices and that minor pest activity remains below actionable economic injury thresholds.', True, False, 8),
        ('fertilizer_practices', 'Balanced Nutrient & Fertilizer Application', 'Verify application of required basal/top-dress fertilizers or bio-fertilizers according to crop stage.', True, False, 9),
        ('fertilizer_practices', 'Standard Agronomic & Mulching Practices', 'Check weed control, mulching, row spacing, and adherence to approved agronomic recommendations.', True, False, 10),
        ('field_maintenance', 'Weed Management & Boundary Cleanliness', 'Check field plot boundaries, perimeter bunds, and inter-row weed clearance.', True, False, 11),
        ('field_maintenance', 'Field Bund Integrity & Erosion Protection', 'Inspect field bunds, water retention dikes, and soil erosion mitigation measures.', True, False, 12),
        ('corrective_actions', 'Resolution of Past Inspection Deficiencies', 'Verify that all previously flagged non-conformances and corrective actions have been satisfactorily resolved.', False, True, 13),
    ]
    for cat, name, desc, mand, crit, order in defaults:
        FieldInspectionCriterion.objects.create(
            category=cat, name=name, description=desc, is_mandatory=mand, is_critical=crit, order=order, is_active=True
        )


def get_applicable_criteria_for_field(field):
    """
    Returns active inspection criteria applicable to this field based on:
    - Crop type (if specified on criterion)
    - Crop stage (if specified on criterion)
    - Previous corrective actions applicability
    """
    ensure_default_inspection_criteria()
    criteria_qs = FieldInspectionCriterion.objects.filter(is_active=True).prefetch_related('applicable_crop_types')
    applicable = []

    has_past_failures = FieldInspection.objects.filter(
        field=field,
        decision__in=[Field.VerificationStatus.REJECTED, Field.VerificationStatus.NEEDS_IMPROVEMENT]
    ).exists() or FieldCorrectiveAction.objects.filter(
        field=field,
        status__in=[FieldCorrectiveAction.Status.PENDING, FieldCorrectiveAction.Status.IN_PROGRESS]
    ).exists()

    for criterion in criteria_qs:
        # 1. Filter by crop type
        crop_types = criterion.applicable_crop_types.all()
        if crop_types.exists():
            if not field.crop_type or field.crop_type not in crop_types:
                continue

        # 2. Filter by crop stage
        if criterion.applicable_stages:
            stage = (field.crop_stage or '').lower()
            allowed_stages = [s.lower() for s in criterion.applicable_stages]
            if stage not in allowed_stages:
                continue

        # 3. Dynamic adjustment for previous corrective actions criterion
        if criterion.category == FieldInspectionCriterion.Category.CORRECTIVE_ACTIONS:
            # If past failures exist, this becomes mandatory
            if has_past_failures:
                criterion.is_mandatory = True
            else:
                criterion.is_mandatory = False

        applicable.append(criterion)

    return applicable


def calculate_inspection_decision(field, criterion_results_data):
    """
    Validates submitted inspection results against mandatory applicable criteria
    and automatically calculates the decision on the backend:
    - VERIFIED: All mandatory applicable pass, 0 critical fail.
    - REJECTED: Any critical criterion fails, or documented critical requirement fails.
    - NEEDS_IMPROVEMENT: One or more noncritical mandatory criteria fail.
    """
    applicable_criteria = get_applicable_criteria_for_field(field)
    applicable_map = {c.id: c for c in applicable_criteria}
    mandatory_ids = {c.id for c in applicable_criteria if c.is_mandatory}

    provided_map = {}
    for item in criterion_results_data:
        cid = item.get('criterion_id') or item.get('criterion')
        if cid:
            try:
                provided_map[int(cid)] = item
            except (ValueError, TypeError):
                pass

    # Check for missing mandatory criteria
    missing_mandatory = mandatory_ids - set(provided_map.keys())
    if missing_mandatory:
        missing_names = [applicable_map[cid].name for cid in missing_mandatory if cid in applicable_map]
        raise ValidationError(
            f"Missing mandatory inspection criteria: {', '.join(missing_names)}. "
            f"All mandatory applicable criteria must be assessed."
        )

    evaluated_results = []
    failed_critical = []
    failed_noncritical = []

    for cid, c_obj in applicable_map.items():
        res_data = provided_map.get(cid)
        if not res_data:
            # Optional non-mandatory criterion omitted
            continue

        result_val = (res_data.get('result') or '').lower()
        if result_val not in [FieldCriterionResult.Result.PASS, FieldCriterionResult.Result.FAIL, FieldCriterionResult.Result.NOT_APPLICABLE]:
            raise ValidationError(f"Invalid result '{result_val}' for criterion '{c_obj.name}'. Must be 'pass', 'fail', or 'not_applicable'.")

        observation = (res_data.get('observation') or '').strip()
        failure_reason = (res_data.get('failure_reason') or '').strip()
        corrective_action = (res_data.get('corrective_action') or '').strip()
        measured_val = res_data.get('measured_value')
        measured_unit = res_data.get('measured_unit') or c_obj.threshold_unit

        # Validation rules:
        # Rule A: NOT_APPLICABLE requires an observation/explanation
        if result_val == FieldCriterionResult.Result.NOT_APPLICABLE and not observation:
            raise ValidationError(
                f"An explanation is required in 'observation' when criterion '{c_obj.name}' is marked NOT APPLICABLE."
            )

        # Rule B: FAIL requires failure reason and corrective action
        if result_val == FieldCriterionResult.Result.FAIL:
            if not failure_reason:
                raise ValidationError(
                    f"A failure reason is mandatory for failed criterion '{c_obj.name}'."
                )
            if not corrective_action:
                raise ValidationError(
                    f"A recommended corrective action is mandatory for failed criterion '{c_obj.name}'."
                )

            if c_obj.is_critical:
                failed_critical.append((c_obj, failure_reason, corrective_action))
            else:
                failed_noncritical.append((c_obj, failure_reason, corrective_action))

        evaluated_results.append({
            'criterion': c_obj,
            'result': result_val,
            'observation': observation,
            'measured_value': measured_val,
            'measured_unit': measured_unit,
            'failure_reason': failure_reason,
            'corrective_action': corrective_action,
        })

    # Decision logic
    if len(failed_critical) > 0:
        decision = Field.VerificationStatus.REJECTED
    elif len(failed_noncritical) > 0:
        decision = Field.VerificationStatus.NEEDS_IMPROVEMENT
    else:
        decision = Field.VerificationStatus.VERIFIED

    return decision, failed_critical, failed_noncritical, evaluated_results


def submit_field_inspection(field, supervisor, data):
    """
    Atomic transaction:
    1. Validates checklist & calculates decision
    2. Creates FieldInspection
    3. Saves FieldCriterionResult records
    4. Creates FieldCorrectiveAction for all failed criteria
    5. Updates Field.verification_status & Field.verified_by
    6. Logs FieldVerificationHistory
    7. Sends Alert notification to the farmer
    """
    criterion_results_data = data.get('criterion_results') or []
    if not criterion_results_data:
        raise ValidationError("Field cannot be verified directly without a completed inspection checklist.")

    overall_notes = data.get('overall_notes', '')
    reinspection_date = data.get('reinspection_scheduled_date') or None

    decision, failed_critical, failed_noncritical, evaluated_results = calculate_inspection_decision(
        field, criterion_results_data
    )

    with transaction.atomic():
        previous_status = field.verification_status

        # Find latest previous inspection if this is a reinspection
        latest_prev = FieldInspection.objects.filter(field=field).first()
        is_reinspection = latest_prev is not None

        # Build rejection/improvement reason summary
        all_failures = failed_critical + failed_noncritical
        failure_summary = [
            {
                'criterion_id': c.id,
                'name': c.name,
                'category': c.get_category_display(),
                'is_critical': c.is_critical,
                'reason': reason,
                'corrective_action': action
            }
            for c, reason, action in all_failures
        ]

        rejection_reason = data.get('rejection_reason') or None
        if not rejection_reason and failure_summary:
            rejection_reason = "; ".join([f"{f['name']}: {f['reason']}" for f in failure_summary])

        # 1. Create FieldInspection record
        inspection = FieldInspection.objects.create(
            field=field,
            farm=field.farm,
            supervisor=supervisor,
            farmer=field.farm.user,
            decision=decision,
            overall_notes=overall_notes,
            rejection_reason=rejection_reason if decision in [Field.VerificationStatus.REJECTED, Field.VerificationStatus.NEEDS_IMPROVEMENT] else None,
            reinspection_scheduled_date=reinspection_date,
            is_reinspection=is_reinspection,
            previous_inspection=latest_prev
        )

        # 2. Save individual criterion results & corrective actions
        for item in evaluated_results:
            crit_res = FieldCriterionResult.objects.create(
                inspection=inspection,
                criterion=item['criterion'],
                result=item['result'],
                observation=item['observation'],
                measured_value=item['measured_value'],
                measured_unit=item['measured_unit'],
                failure_reason=item['failure_reason'],
                corrective_action=item['corrective_action']
            )

            # Create corrective action if failed
            if item['result'] == FieldCriterionResult.Result.FAIL:
                FieldCorrectiveAction.objects.create(
                    field=field,
                    inspection=inspection,
                    criterion_result=crit_res,
                    farmer=field.farm.user,
                    action_description=item['corrective_action'],
                    due_date=reinspection_date,
                    status=FieldCorrectiveAction.Status.PENDING
                )

        # 3. Update Field status & supervisor
        field.verification_status = decision
        field.verified_by = supervisor
        if reinspection_date:
            field.reinspection_scheduled_date = reinspection_date
        field.save(update_fields=['verification_status', 'verified_by', 'reinspection_scheduled_date', 'updated_at'])

        # 4. Save audit verification history
        FieldVerificationHistory.objects.create(
            field=field,
            inspection=inspection,
            action_by=supervisor,
            previous_status=previous_status,
            new_status=decision,
            decision=decision,
            reason=rejection_reason or overall_notes,
            failed_criteria_summary=failure_summary
        )

        # 5. Send notification to farmer
        notify_farmer_on_verification_decision(field, supervisor, decision, failure_summary, reinspection_date)

    return inspection, decision


def reject_field_with_reason(field, supervisor, rejection_reason, failed_criteria_data=None, reinspection_date=None):
    """
    Explicit rejection action with mandatory rejection reason and evidence:
    - Saves inspection with decision=REJECTED
    - Records failed criteria or documented reason
    - Notifies the relevant farmer
    - Does not delete the field
    """
    if not rejection_reason or not str(rejection_reason).strip():
        raise ValidationError("A detailed rejection reason is mandatory.")

    failed_criteria_data = failed_criteria_data or []

    with transaction.atomic():
        previous_status = field.verification_status
        latest_prev = FieldInspection.objects.filter(field=field).first()

        inspection = FieldInspection.objects.create(
            field=field,
            farm=field.farm,
            supervisor=supervisor,
            farmer=field.farm.user,
            decision=Field.VerificationStatus.REJECTED,
            rejection_reason=rejection_reason.strip(),
            reinspection_scheduled_date=reinspection_date,
            is_reinspection=latest_prev is not None,
            previous_inspection=latest_prev
        )

        failure_summary = []
        for item in failed_criteria_data:
            cid = item.get('criterion_id') or item.get('criterion')
            if not cid:
                continue
            try:
                crit_obj = FieldInspectionCriterion.objects.get(id=cid)
                reason = item.get('failure_reason') or rejection_reason
                action = item.get('corrective_action') or 'Review field conditions and resolve reported deficiency.'
                crit_res = FieldCriterionResult.objects.create(
                    inspection=inspection,
                    criterion=crit_obj,
                    result=FieldCriterionResult.Result.FAIL,
                    observation=item.get('observation', ''),
                    failure_reason=reason,
                    corrective_action=action
                )
                FieldCorrectiveAction.objects.create(
                    field=field,
                    inspection=inspection,
                    criterion_result=crit_res,
                    farmer=field.farm.user,
                    action_description=action,
                    due_date=reinspection_date,
                    status=FieldCorrectiveAction.Status.PENDING
                )
                failure_summary.append({
                    'criterion_id': crit_obj.id,
                    'name': crit_obj.name,
                    'category': crit_obj.get_category_display(),
                    'is_critical': crit_obj.is_critical,
                    'reason': reason,
                    'corrective_action': action
                })
            except FieldInspectionCriterion.DoesNotExist:
                pass

        # Update field
        field.verification_status = Field.VerificationStatus.REJECTED
        field.verified_by = supervisor
        if reinspection_date:
            field.reinspection_scheduled_date = reinspection_date
        field.save(update_fields=['verification_status', 'verified_by', 'reinspection_scheduled_date', 'updated_at'])

        # Record history
        FieldVerificationHistory.objects.create(
            field=field,
            inspection=inspection,
            action_by=supervisor,
            previous_status=previous_status,
            new_status=Field.VerificationStatus.REJECTED,
            decision=Field.VerificationStatus.REJECTED,
            reason=rejection_reason.strip(),
            failed_criteria_summary=failure_summary
        )

        # Notify farmer
        notify_farmer_on_verification_decision(
            field, supervisor, Field.VerificationStatus.REJECTED, failure_summary, reinspection_date, rejection_reason
        )

    return inspection


def schedule_field_reinspection(field, supervisor, reinspection_date, notes=None):
    """
    Schedules a reinspection date for an inspected field and notifies the farmer.
    """
    if not reinspection_date:
        raise ValidationError("A reinspection date is required.")

    with transaction.atomic():
        field.reinspection_scheduled_date = reinspection_date
        field.save(update_fields=['reinspection_scheduled_date', 'updated_at'])

        latest_inspection = FieldInspection.objects.filter(field=field).first()
        if latest_inspection:
            latest_inspection.reinspection_scheduled_date = reinspection_date
            latest_inspection.save(update_fields=['reinspection_scheduled_date', 'updated_at'])

        FieldVerificationHistory.objects.create(
            field=field,
            inspection=latest_inspection,
            action_by=supervisor,
            previous_status=field.verification_status,
            new_status=field.verification_status,
            decision='REINSPECTION_SCHEDULED',
            reason=f"Reinspection scheduled for {reinspection_date}. Notes: {notes or 'None'}"
        )

        # Notify farmer
        farmer = field.farm.user
        Alert.objects.create(
            user=farmer,
            farm=field.farm,
            field=field,
            alert_type=Alert.AlertType.SYSTEM,
            severity=Alert.Severity.MEDIUM,
            title=f"Reinspection Scheduled: {field.name}",
            message=(
                f"Field Supervisor {supervisor.full_name or supervisor.username} has scheduled a reinspection "
                f"for field '{field.name}' on {reinspection_date}. Please ensure corrective actions are addressed."
            )
        )

    return field


def notify_farmer_on_verification_decision(field, supervisor, decision, failure_summary=None, reinspection_date=None, custom_reason=None):
    """
    Dispatches Alert record to the farmer through the existing PostgreSQL alert system (tbl_alert).
    """
    try:
        farmer = field.farm.user
        sup_name = supervisor.full_name or supervisor.username

        if decision == Field.VerificationStatus.VERIFIED:
            Alert.objects.create(
                user=farmer,
                farm=field.farm,
                field=field,
                alert_type=Alert.AlertType.SYSTEM,
                severity=Alert.Severity.LOW,
                title=f"Field Verified: {field.name}",
                message=(
                    f"Great news! Your field '{field.name}' on farm '{field.farm.name}' has passed all mandatory "
                    f"inspection criteria and is now officially VERIFIED by supervisor {sup_name}."
                )
            )
        elif decision == Field.VerificationStatus.NEEDS_IMPROVEMENT:
            count = len(failure_summary) if failure_summary else 1
            Alert.objects.create(
                user=farmer,
                farm=field.farm,
                field=field,
                alert_type=Alert.AlertType.SYSTEM,
                severity=Alert.Severity.MEDIUM,
                title=f"Field Inspection: Action Required for {field.name}",
                message=(
                    f"Field '{field.name}' was evaluated as NEEDS IMPROVEMENT by supervisor {sup_name}. "
                    f"{count} noncritical criterion item(s) require corrective action. "
                    f"{'Reinspection date: ' + str(reinspection_date) + '.' if reinspection_date else ''} "
                    f"Please review recommended corrective actions in your dashboard."
                )
            )
        elif decision == Field.VerificationStatus.REJECTED:
            reason_text = custom_reason or (
                "; ".join([f"{f['name']}: {f['reason']}" for f in (failure_summary or [])]) or "Critical criteria failed"
            )
            Alert.objects.create(
                user=farmer,
                farm=field.farm,
                field=field,
                alert_type=Alert.AlertType.SYSTEM,
                severity=Alert.Severity.HIGH,
                title=f"Field Verification Rejected: {field.name}",
                message=(
                    f"Field '{field.name}' on farm '{field.farm.name}' was REJECTED during inspection by supervisor {sup_name}. "
                    f"Reason: {reason_text}. "
                    f"{'Reinspection date: ' + str(reinspection_date) + '.' if reinspection_date else ''} "
                    f"Please view the full inspection report and implement corrective actions."
                )
            )
    except Exception as e:
        logger.error(f"Error notifying farmer about verification decision: {e}", exc_info=True)
