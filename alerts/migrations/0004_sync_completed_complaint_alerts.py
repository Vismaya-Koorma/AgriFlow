from django.db import migrations
from django.utils import timezone

def sync_completed_complaint_alerts(apps, schema_editor):
    try:
        Complaint = apps.get_model('maintenance', 'Complaint')
        Alert = apps.get_model('alerts', 'Alert')

        completed_complaints = Complaint.objects.filter(status='completed')
        for cmp_obj in completed_complaints:
            if not cmp_obj.complaint_id:
                continue
            unresolved = Alert.objects.filter(
                is_resolved=False
            ).filter(
                models_Q_or_title(cmp_obj)
            )
            for a in unresolved:
                a.complaint = cmp_obj
                a.is_resolved = True
                a.status = 'resolved'
                if not a.resolved_at:
                    a.resolved_at = timezone.now()
                a.save()
    except Exception:
        pass

def models_Q_or_title(cmp_obj):
    from django.db.models import Q
    return (
        Q(complaint=cmp_obj) |
        Q(title__icontains=cmp_obj.complaint_id) |
        Q(message__icontains=cmp_obj.complaint_id)
    )

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('alerts', '0003_alert_complaint_alert_is_read_alert_status'),
        ('maintenance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(sync_completed_complaint_alerts, reverse_code=reverse_func),
    ]
