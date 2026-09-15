from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from farms.models import Farm, Field, CropType
from alerts.models import Alert
from alerts.services import create_irrigation_notification

User = get_user_model()


class NotificationUserIsolationTests(APITestCase):

    def setUp(self):
        self.crop_rice = CropType.objects.create(name='Rice')
        self.crop_wheat = CropType.objects.create(name='Wheat')

        # Create Farmer A
        self.farmer_a = User.objects.create_user(
            username='farmer_a',
            email='farmer_a@example.com',
            password='Password123!',
            role='farmer'
        )
        self.farm_a = Farm.objects.create(
            user=self.farmer_a,
            name='Farm A',
            location='Location A',
            district='District A',
            total_area=10.0
        )
        self.field_a = Field.objects.create(
            farm=self.farm_a,
            name='Field A1',
            crop_type=self.crop_rice,
            area=2.0
        )

        # Create Farmer B
        self.farmer_b = User.objects.create_user(
            username='farmer_b',
            email='farmer_b@example.com',
            password='Password123!',
            role='farmer'
        )
        self.farm_b = Farm.objects.create(
            user=self.farmer_b,
            name='Farm B',
            location='Location B',
            district='District B',
            total_area=15.0
        )
        self.field_b = Field.objects.create(
            farm=self.farm_b,
            name='Field B1',
            crop_type=self.crop_wheat,
            area=3.0
        )

    def test_farmer_a_sees_only_own_notifications(self):
        """Farmer A must see ONLY Farmer A's notifications."""
        # Create notification for Farmer A
        alert_a = Alert.objects.create(
            user=self.farmer_a,
            farm=self.farm_a,
            field=self.field_a,
            alert_type=Alert.AlertType.IRRIGATION,
            severity=Alert.Severity.HIGH,
            title='Irrigation Required',
            message='Irrigation is recommended for Field A1.'
        )

        # Create notification for Farmer B
        alert_b = Alert.objects.create(
            user=self.farmer_b,
            farm=self.farm_b,
            field=self.field_b,
            alert_type=Alert.AlertType.WEATHER,
            severity=Alert.Severity.LOW,
            title='Weather Warning',
            message='Sunny day ahead.'
        )

        # Authenticate as Farmer A
        self.client.force_authenticate(user=self.farmer_a)
        response = self.client.get('/api/alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        alert_ids = [a['id'] for a in results]

        self.assertIn(alert_a.id, alert_ids)
        self.assertNotIn(alert_b.id, alert_ids)

    def test_farmer_b_cannot_access_farmer_a_notification_by_id(self):
        """Farmer B must get 404 when requesting Farmer A's notification ID."""
        alert_a = Alert.objects.create(
            user=self.farmer_a,
            farm=self.farm_a,
            field=self.field_a,
            alert_type=Alert.AlertType.IRRIGATION,
            severity=Alert.Severity.HIGH,
            title='Irrigation Required',
            message='Irrigation is recommended for Field A1.'
        )

        # Authenticate as Farmer B
        self.client.force_authenticate(user=self.farmer_b)
        response = self.client.get(f'/api/alerts/{alert_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        resolve_response = self.client.post(f'/api/alerts/{alert_a.id}/resolve/')
        self.assertEqual(resolve_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_automatic_irrigation_notification_and_deduplication(self):
        """Verify automatic irrigation notification creation and deduplication."""
        # Generate alert for Field A
        alert1 = create_irrigation_notification(
            field=self.field_a,
            priority='HIGH',
            recommended_water_liters=56090,
            recommendation_title='Irrigation Needed'
        )
        self.assertIsNotNone(alert1)
        self.assertEqual(alert1.user, self.farmer_a)
        self.assertIn('56,090 L', alert1.message)

        # Regenerate same alert (duplicate request)
        alert2 = create_irrigation_notification(
            field=self.field_a,
            priority='HIGH',
            recommended_water_liters=56090,
            recommendation_title='Irrigation Needed'
        )
        self.assertEqual(alert1.id, alert2.id)

        # Count total alerts for Farmer A
        count = Alert.objects.filter(user=self.farmer_a, alert_type=Alert.AlertType.IRRIGATION).count()
        self.assertEqual(count, 1)

    def test_unread_count_per_user(self):
        """Verify unread_count is strictly calculated per user."""
        Alert.objects.create(
            user=self.farmer_a,
            farm=self.farm_a,
            field=self.field_a,
            title='Unread 1',
            message='Test 1',
            is_resolved=False
        )
        Alert.objects.create(
            user=self.farmer_a,
            farm=self.farm_a,
            field=self.field_a,
            title='Unread 2',
            message='Test 2',
            is_resolved=False
        )

        self.client.force_authenticate(user=self.farmer_a)
        res_a = self.client.get('/api/alerts/unread_count/')
        self.assertEqual(res_a.data['unread_count'], 2)

        self.client.force_authenticate(user=self.farmer_b)
        res_b = self.client.get('/api/alerts/unread_count/')
        # Farmer B has no unread alerts
        self.assertEqual(res_b.data['unread_count'], 0)

