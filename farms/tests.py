from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from farms.models import Farm, Field
from master.models import CropType, SoilType

User = get_user_model()

class FarmAndFieldManagementTests(TestCase):
    def setUp(self):
        self.farmer_a = User.objects.create_user(
            username='farm_test_user_a',
            email='user_a@test.com',
            password='Password123!',
            role='farmer'
        )
        self.farmer_b = User.objects.create_user(
            username='farm_test_user_b',
            email='user_b@test.com',
            password='Password123!',
            role='farmer'
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.farmer_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.farmer_b)

        self.unauth_client = APIClient()

        # Seed master crop & soil
        self.crop = CropType.objects.create(name='Paddy')
        self.soil = SoilType.objects.create(name='Loamy')

        # Seed farm & field for User A
        self.farm_a = Farm.objects.create(
            user=self.farmer_a,
            name='Green Valley Farm',
            location='Ernakulam',
            total_area=15.5
        )
        self.field_a = Field.objects.create(
            farm=self.farm_a,
            name='North Field A',
            area=5.0,
            crop_type=self.crop,
            soil_type=self.soil
        )

    # ─── FARM MANAGEMENT TESTS ───────────────────────────────────────────────

    def test_create_farm_valid(self):
        response = self.client_a.post('/api/farms/', {
            'name': 'River View Estate',
            'location': 'Kottayam',
            'total_area': '12.0'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'River View Estate')
        self.assertTrue(Farm.objects.filter(name='River View Estate', user=self.farmer_a).exists())

    def test_create_farm_invalid_data(self):
        response = self.client_a.post('/api/farms/', {
            'name': '',
            'location': 'Kottayam',
            'total_area': '12.0'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_farm_list(self):
        response = self.client_a.get('/api/farms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Green Valley Farm')

    def test_update_farm_valid(self):
        response = self.client_a.patch(f'/api/farms/{self.farm_a.id}/', {
            'name': 'Updated Green Valley Farm'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.farm_a.refresh_from_db()
        self.assertEqual(self.farm_a.name, 'Updated Green Valley Farm')

    def test_delete_farm(self):
        response = self.client_a.delete(f'/api/farms/{self.farm_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_24_NO_CONTENT if hasattr(status, 'HTTP_24_NO_CONTENT') else 204)
        self.assertFalse(Farm.objects.filter(id=self.farm_a.id).exists())

    def test_unauthenticated_farm_access_denied(self):
        response = self.unauth_client.get('/api/farms/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ─── USER DATA ISOLATION (FARMS) ──────────────────────────────────────────

    def test_user_b_cannot_access_user_a_farm(self):
        response = self.client_b.get('/api/farms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        farm_ids = [f['id'] for f in results]
        self.assertNotIn(self.farm_a.id, farm_ids)

        detail_resp = self.client_b.get(f'/api/farms/{self.farm_a.id}/')
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_b_cannot_update_user_a_farm(self):
        response = self.client_b.patch(f'/api/farms/{self.farm_a.id}/', {'name': 'Hacked Farm Name'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.farm_a.refresh_from_db()
        self.assertNotEqual(self.farm_a.name, 'Hacked Farm Name')

    def test_user_b_cannot_delete_user_a_farm(self):
        response = self.client_b.delete(f'/api/farms/{self.farm_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Farm.objects.filter(id=self.farm_a.id).exists())

    # ─── FIELD MANAGEMENT TESTS ───────────────────────────────────────────────

    def test_create_field_linked_to_correct_farm(self):
        response = self.client_a.post('/api/fields/', {
            'farm': self.farm_a.id,
            'name': 'South Paddy Block',
            'area': '3.5',
            'crop_type': self.crop.id,
            'soil_type': self.soil.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['farm'], self.farm_a.id)

    def test_create_field_invalid_data(self):
        response = self.client_a.post('/api/fields/', {
            'farm': self.farm_a.id,
            'name': '',
            'area': '0.0'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_b_cannot_access_user_a_field(self):
        response = self.client_b.get(f'/api/fields/{self.field_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SupervisorFieldVerificationTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='farmer_test_user', email='farmer@test.com', password='Password123!', role='farmer'
        )
        self.supervisor = User.objects.create_user(
            username='supervisor_test_user', email='supervisor@test.com', password='Password123!', role='supervisor'
        )

        self.farmer_client = APIClient()
        self.farmer_client.force_authenticate(user=self.farmer)

        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(user=self.supervisor)

        self.crop = CropType.objects.create(name='Paddy')
        self.soil = SoilType.objects.create(name='Loamy')
        self.farm = Farm.objects.create(user=self.farmer, name='Verification Test Farm', location='Ernakulam', total_area=10.0)
        self.field = Field.objects.create(farm=self.farm, name='Test Field', area=3.0, crop_type=self.crop, soil_type=self.soil)

    def test_farmer_cannot_set_verification_status_on_create(self):
        response = self.farmer_client.post('/api/fields/', {
            'farm': self.farm.id,
            'name': 'New Unverified Field',
            'area': '2.0',
            'verification_status': 'verified'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['verification_status'], 'pending')

    def test_farmer_cannot_call_verify_endpoint(self):
        response = self.farmer_client.post(f'/api/fields/{self.field.id}/verify/', {'status': 'verified'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_can_verify_field(self):
        response = self.supervisor_client.post(f'/api/fields/{self.field.id}/verify/', {'status': 'verified'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.field.refresh_from_db()
        self.assertEqual(self.field.verification_status, 'verified')
        self.assertEqual(self.field.verified_by, self.supervisor)
