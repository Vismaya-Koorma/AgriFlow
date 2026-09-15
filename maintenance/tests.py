from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from farms.models import Farm, Field
from maintenance.models import Complaint, ComplaintUpdate
from alerts.models import Alert


class MaintenanceWorkflowTests(TestCase):
    def setUp(self):
        # Create users
        self.farmer1 = User.objects.create_user(
            username='farmer1', email='farmer1@example.com', password='password123',
            full_name='Farmer One', role=User.Role.FARMER
        )
        self.farmer2 = User.objects.create_user(
            username='farmer2', email='farmer2@example.com', password='password123',
            full_name='Farmer Two', role=User.Role.FARMER
        )
        self.worker1 = User.objects.create_user(
            username='worker1', email='worker1@example.com', password='password123',
            full_name='Worker One', role=User.Role.MAINTENANCE
        )

        # Create Farm & Field for Farmer 1
        self.farm1 = Farm.objects.create(
            user=self.farmer1, name='Green Valley Farm', location='Valley Region', total_area=5.0
        )
        self.field1 = Field.objects.create(
            farm=self.farm1, name='Field 1', area=2.5
        )

        # Create Farm & Field for Farmer 2
        self.farm2 = Farm.objects.create(
            user=self.farmer2, name='Sunrise Farm', location='East Hills', total_area=6.0
        )
        self.field2 = Field.objects.create(
            farm=self.farm2, name='Field A', area=3.0
        )

        self.client_farmer1 = APIClient()
        self.client_farmer1.force_authenticate(user=self.farmer1)

        self.client_farmer2 = APIClient()
        self.client_farmer2.force_authenticate(user=self.farmer2)

        self.client_worker1 = APIClient()
        self.client_worker1.force_authenticate(user=self.worker1)

    def test_farmer_submit_complaint_and_notification(self):
        """Farmer submits a complaint; assigned worker receives alert."""
        response = self.client_farmer1.post('/api/maintenance/complaints/', {
            'farm': self.farm1.id,
            'field': self.field1.id,
            'category': 'water_leakage',
            'title': 'Drip pipe burst near main valve',
            'description': 'Water leaking at high pressure near field boundary.',
            'priority': 'high',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint_id = response.data['id']

        # Verify DB object
        complaint = Complaint.objects.get(id=complaint_id)
        self.assertEqual(complaint.submitted_by, self.farmer1)
        self.assertEqual(complaint.assigned_to, self.worker1)
        self.assertEqual(complaint.status, 'pending')
        self.assertTrue(complaint.complaint_id.startswith('CMP-'))

        # Verify Alert created for maintenance worker
        alerts = Alert.objects.filter(user=self.worker1)
        self.assertTrue(alerts.exists())
        self.assertIn('New Maintenance Complaint', alerts.first().title)

    def test_user_isolation_security(self):
        """Farmer 2 cannot see Farmer 1's complaint."""
        complaint = Complaint.objects.create(
            submitted_by=self.farmer1,
            assigned_to=self.worker1,
            farm=self.farm1,
            field=self.field1,
            category='pump',
            title='Pump motor failure',
            description='Motor overheating and stopping.',
            priority='urgent'
        )

        # Farmer 1 lists complaints -> gets 1
        res1 = self.client_farmer1.get('/api/maintenance/complaints/')
        self.assertEqual(len(res1.data), 1)

        # Farmer 2 lists complaints -> gets 0
        res2 = self.client_farmer2.get('/api/maintenance/complaints/')
        self.assertEqual(len(res2.data), 0)

        # Farmer 2 tries to access Farmer 1 complaint directly -> 404 Not Found
        res_detail = self.client_farmer2.get(f'/api/maintenance/complaints/{complaint.id}/')
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_full_worker_workflow(self):
        """Worker accepts complaint, updates progress, and marks complete."""
        complaint = Complaint.objects.create(
            submitted_by=self.farmer1,
            assigned_to=self.worker1,
            farm=self.farm1,
            field=self.field1,
            category='pipe',
            title='Main feeder pipe crack',
            description='Pipe leaking under pressure.',
            priority='medium'
        )

        # Step 1: Worker accepts task
        res_accept = self.client_worker1.post(f'/api/maintenance/complaints/{complaint.id}/accept/')
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'accepted')

        # Check Farmer alert for acceptance
        farmer_alerts = Alert.objects.filter(user=self.farmer1)
        self.assertTrue(farmer_alerts.filter(title__icontains='Accepted').exists())

        # Step 2: Worker updates progress to 50%
        res_prog = self.client_worker1.post(f'/api/maintenance/complaints/{complaint.id}/update_progress/', {
            'progress': 50,
            'message': 'Replaced cracked section, sealing joints.'
        })
        self.assertEqual(res_prog.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.progress, 50)
        self.assertEqual(complaint.status, 'in_progress')

        # Step 3: Worker completes task
        res_comp = self.client_worker1.post(f'/api/maintenance/complaints/{complaint.id}/complete/', {
            'completion_notes': 'Pressure test passed 100%. All leaks fixed.'
        })
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.progress, 100)
        self.assertEqual(complaint.status, 'completed')
        self.assertIsNotNone(complaint.completed_at)

        # Check final completed alert to farmer
        self.assertTrue(Alert.objects.filter(user=self.farmer1, title__icontains='Completed').exists())
