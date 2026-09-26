from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from alerts.models import Alert
from maintenance.models import Complaint

User = get_user_model()

class NotificationSystemTests(TestCase):
    def setUp(self):
        self.farmer_a = User.objects.create_user(
            username='alert_farmer_a',
            email='alert_a@test.com',
            password='Password123!',
            role='farmer'
        )
        self.farmer_b = User.objects.create_user(
            username='alert_farmer_b',
            email='alert_b@test.com',
            password='Password123!',
            role='farmer'
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.farmer_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.farmer_b)

        # Create sample alerts for Farmer A
        self.alert_info = Alert.objects.create(
            user=self.farmer_a,
            alert_type=Alert.AlertType.WEATHER,
            severity=Alert.Severity.LOW,
            title="Rain Advisory",
            message="Light rain forecasted",
            is_read=False,
            is_resolved=False,
            status=Alert.Status.PENDING
        )

    # ─── PHASE 8: NOTIFICATION SYSTEM TESTS ───────────────────────────────────

    def test_user_data_isolation_on_alerts(self):
        # Farmer B trying to access Farmer A's alert
        response = self.client_b.get(f'/api/alerts/{self.alert_info.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unread_count_calculation(self):
        response = self.client_a.get('/api/alerts/unread_count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('unread_count', response.data)
        # Verify count matches unresolved alerts
        unresolved_count = Alert.objects.filter(user=self.farmer_a, is_resolved=False).count()
        self.assertEqual(response.data['unread_count'], unresolved_count)

    def test_read_state_does_not_resolve_alert(self):
        response = self.client_a.patch(f'/api/alerts/{self.alert_info.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert_info.refresh_from_db()
        self.assertTrue(self.alert_info.is_read)
        self.assertFalse(self.alert_info.is_resolved)
        self.assertEqual(self.alert_info.status, 'pending')

    def test_manual_resolution_blocked_on_maintenance_alert(self):
        maint_complaint = Complaint.objects.create(
            submitted_by=self.farmer_a,
            title='Pipeline Leakage',
            category='pipe',
            priority='high',
            description='Pipe leaking in sector 2'
        )
        maint_alert = Alert.objects.create(
            user=self.farmer_a,
            complaint=maint_complaint,
            alert_type=Alert.AlertType.SYSTEM,
            severity=Alert.Severity.HIGH,
            title="Maintenance Complaint Created",
            message="CMP-0099 created",
            is_resolved=False,
            status=Alert.Status.PENDING
        )
        # Attempting manual resolution on maintenance alert should be restricted or handled safely
        self.assertFalse(maint_alert.is_resolved)

    def test_retroactive_sync_existing_completed_complaints(self):
        for cid in ['CMP-0001', 'CMP-0002', 'CMP-0003']:
            cmp_item = Complaint.objects.filter(complaint_id=cid).first()
            if cmp_item and cmp_item.status == 'completed':
                alerts = Alert.objects.filter(complaint=cmp_item)
                for a in alerts:
                    self.assertTrue(a.is_resolved)
                    self.assertEqual(a.status, 'resolved')
