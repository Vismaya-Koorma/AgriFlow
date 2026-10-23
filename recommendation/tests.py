"""
Tests for the recommendation app — IrrigationRecommendation model and water-deficit engine.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from master.models import CropType, SoilType
from farms.models import Farm, Field
from recommendation.models import IrrigationRecommendation

User = get_user_model()


class IrrigationRecommendationModelTests(TestCase):
    """Tests for IrrigationRecommendation model integrity."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='rec_farmer', email='rec@example.com',
            password='Password123!', full_name='Rec Farmer',
            terms_accepted=True,
        )
        self.crop = CropType.objects.create(name='Tomato', status=True)
        self.soil = SoilType.objects.create(name='Loam', status=True)
        self.farm = Farm.objects.create(
            user=self.user, name='Test Farm', total_area=Decimal('2.5'), state='Kerala'
        )
        self.field = Field.objects.create(
            farm=self.farm, name='Field A', area=Decimal('1.0'),
            crop_type=self.crop, soil_type=self.soil, crop_stage='vegetative',
        )

    def test_create_irrigation_recommendation(self):
        """IrrigationRecommendation can be created with valid data."""
        rec = IrrigationRecommendation.objects.create(
            field=self.field,
            recommendation_status=IrrigationRecommendation.Status.IRRIGATE,
            recommended_volume_litres=Decimal('5000.00'),
            recommended_duration_minutes=60,
            reason='Field water deficit exceeds threshold.',
        )
        self.assertEqual(rec.field, self.field)
        self.assertEqual(rec.recommendation_status, 'irrigate')
        self.assertGreater(rec.recommended_volume_litres, 0)

    def test_recommendation_status_choices(self):
        """Only valid status choices are accepted — irrigate / monitor / postpone."""
        valid_statuses = [
            IrrigationRecommendation.Status.IRRIGATE,
            IrrigationRecommendation.Status.MONITOR,
            IrrigationRecommendation.Status.POSTPONE,
        ]
        for s in valid_statuses:
            rec = IrrigationRecommendation.objects.create(
                field=self.field,
                recommendation_status=s,
                recommended_volume_litres=Decimal('1000.00'),
                recommended_duration_minutes=30,
            )
            self.assertEqual(rec.recommendation_status, s)

    def test_recommendation_str(self):
        """__str__ returns expected format."""
        rec = IrrigationRecommendation.objects.create(
            field=self.field,
            recommendation_status=IrrigationRecommendation.Status.MONITOR,
            recommended_volume_litres=Decimal('2000.00'),
            recommended_duration_minutes=45,
        )
        self.assertIn('Field A', str(rec))
        self.assertIn('monitor', str(rec))


class WaterDeficitEngineTests(TestCase):
    """Tests for the scientific irrigation water-deficit calculation engine."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='engine_farmer', email='engine@example.com',
            password='Password123!', full_name='Engine Farmer',
            terms_accepted=True,
        )
        self.crop = CropType.objects.create(name='Paddy / Rice', status=True)
        self.soil = SoilType.objects.create(name='Loam', status=True)
        self.farm = Farm.objects.create(
            user=self.user, name='Engine Farm', total_area=Decimal('1.0'), state='Kerala'
        )
        self.field = Field.objects.create(
            farm=self.farm, name='Engine Field', area=Decimal('1.0'),
            crop_type=self.crop, soil_type=self.soil, crop_stage='vegetative',
        )

    def test_water_deficit_returns_expected_keys(self):
        """calculate_crop_water_deficit returns all required output keys."""
        from irrigation.services import calculate_crop_water_deficit
        result = calculate_crop_water_deficit(
            field=self.field,
            weather_data={'temperature': 30.0, 'humidity': 70.0, 'wind_speed': 10.0},
        )
        required_keys = [
            'irrigation_needed', 'recommendation', 'priority',
            'recommended_water_liters', 'crop_name', 'confidence',
            'today_crop_demand_liters', 'net_water_deficit_liters',
        ]
        for key in required_keys:
            self.assertIn(key, result, f"Missing key: {key}")

    def test_water_deficit_positive_demand(self):
        """Crop water demand must always be positive for a real field."""
        from irrigation.services import calculate_crop_water_deficit
        result = calculate_crop_water_deficit(field=self.field)
        self.assertGreater(result['today_crop_demand_liters'], 0)

    def test_water_deficit_heavy_rain_reduces_irrigation(self):
        """Heavy forecast rainfall should reduce or eliminate recommended irrigation."""
        from irrigation.services import calculate_crop_water_deficit
        no_rain_result = calculate_crop_water_deficit(
            field=self.field,
            weather_data={'temperature': 28.0, 'humidity': 65.0},
            override_rain_forecast_mm=0.0,
        )
        heavy_rain_result = calculate_crop_water_deficit(
            field=self.field,
            weather_data={'temperature': 28.0, 'humidity': 65.0},
            override_rain_forecast_mm=50.0,
        )
        self.assertGreaterEqual(
            no_rain_result['recommended_water_liters'],
            heavy_rain_result['recommended_water_liters'],
        )

    def test_confidence_within_bounds(self):
        """Confidence score must always be between 70 and 95."""
        from irrigation.services import calculate_crop_water_deficit
        result = calculate_crop_water_deficit(field=self.field)
        self.assertGreaterEqual(result['confidence'], 70)
        self.assertLessEqual(result['confidence'], 95)
