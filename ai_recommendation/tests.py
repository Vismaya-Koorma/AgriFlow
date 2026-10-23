"""
Tests for the ai_recommendation app — AIRecommendationLog model and RF smoke test.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch, MagicMock

from master.models import CropType, SoilType
from farms.models import Farm, Field
from ai_recommendation.models import AIRecommendationLog

User = get_user_model()


class AIRecommendationLogModelTests(TestCase):
    """Tests for AIRecommendationLog model integrity."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='ai_farmer', email='ai@example.com',
            password='Password123!', full_name='AI Farmer',
            terms_accepted=True,
        )
        self.crop = CropType.objects.create(name='Tomato', status=True)
        self.soil = SoilType.objects.create(name='Loam', status=True)
        self.farm = Farm.objects.create(
            user=self.user, name='AI Farm', total_area=Decimal('1.0'), state='Kerala'
        )
        self.field = Field.objects.create(
            farm=self.farm, name='AI Field', area=Decimal('1.0'),
            crop_type=self.crop, soil_type=self.soil, crop_stage='vegetative',
        )

    def test_create_ai_recommendation_log(self):
        """AIRecommendationLog can be created with valid data."""
        log = AIRecommendationLog.objects.create(
            field=self.field,
            farm=self.farm,
            irrigation_needed=True,
            recommended_water_l_m2=Decimal('4.50'),
            crop_stress='Medium',
            confidence=85,
            reason='RF model predicted irrigation required based on weather and soil data.',
            temperature=Decimal('30.0'),
            humidity=Decimal('65.0'),
            rainfall=Decimal('0.0'),
            wind_speed=Decimal('12.0'),
            days_since_irrigation=3,
        )
        self.assertEqual(log.field, self.field)
        self.assertTrue(log.irrigation_needed)
        self.assertEqual(log.confidence, 85)

    def test_ai_log_str_representation(self):
        """__str__ includes field name."""
        log = AIRecommendationLog.objects.create(
            field=self.field,
            irrigation_needed=False,
            recommended_water_l_m2=Decimal('0.00'),
            crop_stress='Low',
            confidence=90,
        )
        self.assertIn('AI Field', str(log))

    def test_ai_log_stress_choices(self):
        """Crop stress accepts Low / Medium / High values."""
        for stress in ['Low', 'Medium', 'High']:
            log = AIRecommendationLog.objects.create(
                field=self.field,
                irrigation_needed=False,
                recommended_water_l_m2=Decimal('2.00'),
                crop_stress=stress,
                confidence=80,
            )
            self.assertEqual(log.crop_stress, stress)

    def test_ai_recommendation_endpoint_requires_auth(self):
        """GET /api/ai/recommendation/ requires authentication."""
        client = APIClient()
        response = client.get('/api/ai/recommendation/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_ai_recommendation_endpoint_authenticated(self):
        """Authenticated farmer can reach /api/ai/recommendation/ endpoint."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        # The endpoint may return 200 with no field, 400 (field required), or 200 with data
        # We just confirm it doesn't return 401/403 (auth working) and doesn't crash (500)
        response = client.get('/api/ai/recommendation/')
        self.assertNotIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])
