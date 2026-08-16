import logging
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
    Ensures duplicate protection and handles severity escalation.
    """
    if not field:
        return None

    priority_upper = str(priority).upper()
    water_liters = int(recommended_water_liters or 0)

    # Rule 1: LOW priority or 0 water -> Do not create an irrigation warning notification
    if priority_upper == 'LOW' or water_liters <= 0:
        return None

    # Determine Severity, Title & Message according to specification
    if priority_upper == 'HIGH':
        severity = Alert.Severity.HIGH
        title = "Urgent Irrigation Required"
        message = f"{field.name} requires urgent irrigation. Recommended amount: {water_liters:,} Liters."
    elif priority_upper == 'MEDIUM':
        severity = Alert.Severity.MEDIUM
        title = "Irrigation Recommended"
        message = f"{field.name} requires irrigation. Recommended amount: {water_liters:,} Liters."
    else:
        return None

    try:
        # Query active unresolved irrigation alerts for this field
        existing_alerts = Alert.objects.filter(
            field=field,
            alert_type=Alert.AlertType.IRRIGATION,
            is_resolved=False
        ).order_by('-created_at')

        if existing_alerts.exists():
            latest_alert = existing_alerts.first()
            # If priority is the same
            if latest_alert.severity == severity:
                # Same priority & unresolved -> prevent duplicate
                return latest_alert
            else:
                # Priority changed (e.g. MEDIUM -> HIGH) -> resolve old lower priority alert & create new
                existing_alerts.update(is_resolved=True, resolved_at=timezone.now())

        # Create new Alert record in PostgreSQL (tbl_alert)
        new_alert = Alert.objects.create(
            field=field,
            alert_type=Alert.AlertType.IRRIGATION,
            severity=severity,
            title=title,
            message=message,
            is_resolved=False
        )
        logger.info(f"Created irrigation alert ID {new_alert.id} ({severity}) for field '{field.name}'")
        return new_alert

    except Exception as e:
        logger.error(f"Error creating irrigation notification: {e}", exc_info=True)
        return None
