import logging
from django.db import models
from django.utils import timezone
from .models import Alert

logger = logging.getLogger(__name__)


def create_irrigation_notification(
    field=None,
    priority='LOW',
    recommended_water_liters=0,
    recommendation_title='Irrigation Needed',
    reason=''
):
    """
    Creates an Alert record in PostgreSQL for MEDIUM and HIGH priority irrigation recommendations.
    Ensures duplicate protection and assigns recipient to field.farm.user.
    """
    if not field or not hasattr(field, 'farm') or not field.farm or not field.farm.user:
        return None

    user = field.farm.user
    farm = field.farm
    priority_upper = str(priority).upper()
    water_liters = int(recommended_water_liters or 0)

    # Rule 1: LOW priority or 0 water -> Do not create an irrigation warning notification
    if priority_upper == 'LOW' or water_liters <= 0:
        try:
            Alert.objects.filter(
                user=user,
                field=field,
                alert_type=Alert.AlertType.IRRIGATION,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())
        except Exception as e:
            logger.error(f"Error auto-resolving irrigation alert: {e}")
        return None

    # Determine Severity, Title & Message according to specification
    title = "Irrigation Required" if priority_upper != 'HIGH' else "Urgent Irrigation Required"
    severity = Alert.Severity.HIGH if priority_upper == 'HIGH' else Alert.Severity.MEDIUM
    message = f"Irrigation is recommended for {field.name}. Priority: {priority_upper}. Estimated water requirement: {water_liters:,} L."

    try:
        # Query active unresolved irrigation alerts for this user & field
        existing_alerts = Alert.objects.filter(
            user=user,
            field=field,
            alert_type=Alert.AlertType.IRRIGATION,
            is_resolved=False
        ).order_by('-created_at')

        if existing_alerts.exists():
            latest_alert = existing_alerts.first()
            # Same priority & unresolved -> prevent duplicate
            if latest_alert.severity == severity:
                return latest_alert
            else:
                # Priority changed -> resolve old lower priority alert & create new
                existing_alerts.update(is_resolved=True, resolved_at=timezone.now())

        # Create new Alert record in PostgreSQL (tbl_alert)
        new_alert = Alert.objects.create(
            user=user,
            farm=farm,
            field=field,
            alert_type=Alert.AlertType.IRRIGATION,
            severity=severity,
            title=title,
            message=message,
            is_resolved=False
        )
        logger.info(f"Created irrigation alert ID {new_alert.id} ({severity}) for user '{user.username}' and field '{field.name}'")
        return new_alert

    except Exception as e:
        logger.error(f"Error creating irrigation notification: {e}", exc_info=True)
        return None


def update_weather_notification(field=None, rain_probability=0, condition=''):
    """
    Creates or auto-resolves weather rain notifications for a field.
    Only creates/maintains alert if rain is expected (rain_probability >= 50% or condition contains Rain/Thunderstorm/Drizzle).
    Auto-resolves if rain is no longer expected.
    """
    if not field or not hasattr(field, 'farm') or not field.farm or not field.farm.user:
        return None

    user = field.farm.user
    farm = field.farm
    prob = float(rain_probability or 0)
    cond_str = str(condition or '').lower()

    rain_expected = prob >= 50 or any(k in cond_str for k in ['rain', 'thunderstorm', 'drizzle', 'shower'])

    existing_alerts = Alert.objects.filter(
        user=user,
        field=field,
        alert_type=Alert.AlertType.WEATHER,
        is_resolved=False
    )

    if not rain_expected:
        if existing_alerts.exists():
            existing_alerts.update(is_resolved=True, resolved_at=timezone.now())
        return None

    severity = Alert.Severity.HIGH if (prob >= 70 or 'thunderstorm' in cond_str or 'heavy' in cond_str) else Alert.Severity.MEDIUM
    title = "Rain Forecasted"
    message = f"Weather forecast predicts rain ({int(prob)}% chance, {condition or 'Rain'}) for {field.name}. Consider postponing scheduled irrigation."

    if existing_alerts.exists():
        latest = existing_alerts.first()
        if latest.severity == severity and latest.message == message:
            return latest
        existing_alerts.update(is_resolved=True, resolved_at=timezone.now())

    try:
        new_alert = Alert.objects.create(
            user=user,
            farm=farm,
            field=field,
            alert_type=Alert.AlertType.WEATHER,
            severity=severity,
            title=title,
            message=message,
            is_resolved=False
        )
        logger.info(f"Created weather alert ID {new_alert.id} ({severity}) for user '{user.username}' and field '{field.name}'")
        return new_alert
    except Exception as e:
        logger.error(f"Error creating weather notification: {e}", exc_info=True)
        return None


def resolve_irrigation_notification(field=None, user=None):
    """
    Automatically marks pending irrigation alert(s) for a specific field and user as RESOLVED
    when the related irrigation task is marked completed.
    """
    if not field and not user:
        return
    try:
        filter_kwargs = {'alert_type': Alert.AlertType.IRRIGATION, 'is_resolved': False}
        if field:
            filter_kwargs['field'] = field
        if user:
            filter_kwargs['user'] = user

        pending_alerts = Alert.objects.filter(**filter_kwargs)
        updated_count = pending_alerts.update(
            is_resolved=True,
            status=Alert.Status.RESOLVED,
            resolved_at=timezone.now()
        )
        logger.info(f"Auto-resolved {updated_count} irrigation alert(s) for field={field} user={user}")
    except Exception as e:
        logger.error(f"Error resolving irrigation notification: {e}", exc_info=True)


def resolve_maintenance_notification(complaint=None):
    """
    Automatically marks pending maintenance alert(s) linked to a complaint as RESOLVED
    when the complaint is marked completed.
    """
    if not complaint:
        return
    try:
        pending_alerts = Alert.objects.filter(
            models.Q(complaint=complaint) |
            (models.Q(alert_type=Alert.AlertType.SYSTEM) & models.Q(title__icontains=complaint.complaint_id or '')) |
            (models.Q(alert_type=Alert.AlertType.SYSTEM) & models.Q(message__icontains=complaint.complaint_id or ''))
        ).filter(is_resolved=False)
        updated_count = pending_alerts.update(
            complaint=complaint,
            is_resolved=True,
            status=Alert.Status.RESOLVED,
            resolved_at=timezone.now()
        )
        logger.info(f"Auto-resolved {updated_count} maintenance alert(s) for complaint {complaint.complaint_id}")
    except Exception as e:
        logger.error(f"Error resolving maintenance notification: {e}", exc_info=True)


def sync_maintenance_notifications():
    """
    Safely synchronizes existing maintenance notifications with their related complaint status.
    If a complaint is Completed, all notifications referencing that complaint (via FK or title/message CMP-xxxx)
    are marked as is_resolved=True, status='resolved'.
    """
    try:
        from maintenance.models import Complaint
        completed_complaints = Complaint.objects.filter(status=Complaint.Status.COMPLETED)
        for cmp_obj in completed_complaints:
            if not cmp_obj.complaint_id:
                continue
            query = models.Q(complaint=cmp_obj) | models.Q(title__icontains=cmp_obj.complaint_id) | models.Q(message__icontains=cmp_obj.complaint_id)
            unresolved_alerts = Alert.objects.filter(query).filter(models.Q(is_resolved=False) | ~models.Q(status=Alert.Status.RESOLVED))
            if unresolved_alerts.exists():
                unresolved_alerts.update(
                    complaint=cmp_obj,
                    is_resolved=True,
                    status=Alert.Status.RESOLVED
                )
    except Exception as e:
        logger.error(f"Error in sync_maintenance_notifications: {e}", exc_info=True)




