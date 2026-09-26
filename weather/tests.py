from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from farms.models import Farm, Field
from weather.models import WeatherData

User = get_user_model()

class WeatherAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='weather_tester',
            email='weather@test.com',
            password='Password123!',
            role='farmer'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.farm = Farm.objects.create(
            user=self.user,
            name='Ernakulam Agro Farm',
            location='Ernakulam',
            total_area=10.0
        )
        self.field = Field.objects.create(
            farm=self.farm,
            name='Paddy Field 1',
            area=4.0
        )

    # ─── PHASE 6: WEATHER API TESTS ──────────────────────────────────────────

    def test_get_current_weather_with_valid_field(self):
        response = self.client.get(f'/api/weather/current/?field_id={self.field.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('has_location', response.data)
        self.assertTrue(response.data['has_location'])
        self.assertIn('temperature', response.data)
        self.assertIn('humidity', response.data)

    def test_get_current_weather_with_location_param(self):
        response = self.client.get('/api/weather/current/?location=Kottayam')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_location'])
        self.assertIn('temperature', response.data)

    def test_get_weather_forecast(self):
        response = self.client.get(f'/api/weather/forecast/?field_id={self.field.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('forecast', response.data)
        self.assertIsInstance(response.data['forecast'], list)

    def test_unauthenticated_weather_access_denied(self):
        unauth_client = APIClient()
        response = unauth_client.get('/api/weather/current/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
