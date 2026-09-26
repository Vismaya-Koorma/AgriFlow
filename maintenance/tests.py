from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from farms.models import Farm, Field
from maintenance.models import Complaint, ComplaintUpdate
from alerts.models import Alert

User = get_user_model()

class MaintenanceWorkflowTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='maint_farmer_1',
            email='farmer1@test.com',
            password='Password123!',
            role='farmer'
        )
        self.worker = User.objects.create_user(
            username='maint_worker_1',
            email='worker1@test.com',
            password='Password123!',
            role='maintenance'
        )
        self.other_farmer = User.objects.create_user(
            username='maint_farmer_2',
            email='farmer2@test.com',
            password='Password123!',
            role='farmer'
        )

        self.client_farmer = APIClient()
        self.client_farmer.force_authenticate(user=self.farmer)

        self.client_worker = APIClient()
        self.client_worker.force_authenticate(user=self.worker)

        self.client_other = APIClient()
        self.client_other.force_authenticate(user=self.other_farmer)

        self.farm = Farm.objects.create(user=self.farmer, name='Main Farm', location='Palakkad', total_area=12.0)
        self.field = Field.objects.create(farm=self.farm, name='North Block 1', area=4.0)

    # ─── PHASE 9: MAINTENANCE WORKFLOW TESTS ──────────────────────────────────

    def test_complete_maintenance_lifecycle(self):
        # 1. Farmer creates complaint
        resp_create = self.client_farmer.post('/api/maintenance/complaints/', {
            'farm': self.farm.id,
            'field': self.field.id,
            'title': 'Drip Emitter Clogging',
            'category': 'drip',
            'priority': 'high',
            'description': 'Emitter lines clogged with sediment'
        })
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        cmp_id = resp_create.data['id']
        complaint = Complaint.objects.get(id=cmp_id)
        self.assertEqual(complaint.status, 'pending')

        # Verify notification created for worker
        worker_alert = Alert.objects.filter(user=complaint.assigned_to, complaint=complaint).first()
        self.assertIsNotNone(worker_alert)
        self.assertFalse(worker_alert.is_resolved)

        # 2. Worker accepts complaint
        resp_accept = self.client_worker.post(f'/api/maintenance/complaints/{cmp_id}/accept/')
        self.assertEqual(resp_accept.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'accepted')
        # Alert must remain unresolved
        worker_alert.refresh_from_db()
        self.assertFalse(worker_alert.is_resolved)

        # 3. Worker updates progress to 60%
        resp_progress = self.client_worker.post(f'/api/maintenance/complaints/{cmp_id}/update_progress/', {
            'progress': 60,
            'status': 'in_progress',
            'message': 'Flushing main line filters'
        })
        self.assertEqual(resp_progress.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'in_progress')
        worker_alert.refresh_from_db()
        self.assertFalse(worker_alert.is_resolved)

        # 4. Worker completes complaint
        resp_complete = self.client_worker.post(f'/api/maintenance/complaints/{cmp_id}/complete/', {
            'completion_notes': 'Flushed all emitter lines and replaced acid wash filter unit.'
        })
        self.assertEqual(resp_complete.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'completed')

        # 5. Verify related notifications automatically resolved
        worker_alert.refresh_from_db()
        self.assertTrue(worker_alert.is_resolved)
        self.assertEqual(worker_alert.status, 'resolved')

    def test_unauthorized_user_cannot_modify_complaint(self):
        # Farmer 1 creates complaint
        resp_create = self.client_farmer.post('/api/maintenance/complaints/', {
            'farm': self.farm.id,
            'field': self.field.id,
            'title': 'Valve Leak',
            'category': 'pipe',
            'priority': 'medium',
            'description': 'Main gate valve leaking'
        })
        cmp_id = resp_create.data['id']

        # Other farmer cannot complete or modify Farmer 1's complaint
        resp_complete = self.client_other.post(f'/api/maintenance/complaints/{cmp_id}/complete/', {
            'completion_notes': 'Malicious attempt'
        })
        self.assertIn(resp_complete.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
