from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from master.models import CropType, SoilType, CropVariety, CropWaterRequirement, CropVarietyStageDuration
from master.services import calculate_expected_crop_stage

User = get_user_model()

class CropAndVarietyTesting(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='master_tester',
            email='master@test.com',
            password='Password123!',
            role='farmer'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Seed test crop types
        self.crop_rice = CropType.objects.create(name='Paddy Rice', description='Main staple crop')
        self.crop_tomato = CropType.objects.create(name='Tomato', description='Solanaceous vegetable')

        # Seed test varieties
        self.variety_jyothi = CropVariety.objects.create(crop=self.crop_rice, variety_name='Jyothi Rice')
        self.variety_uma = CropVariety.objects.create(crop=self.crop_rice, variety_name='Uma Rice')
        self.variety_arka = CropVariety.objects.create(crop=self.crop_tomato, variety_name='Arka Rakshak Tomato')

        # Seed stage durations for Jyothi Rice
        # Germination: 0-10, Vegetative: 11-45, Flowering: 46-75, Fruiting: 76-105, Harvesting: 106+
        CropVarietyStageDuration.objects.create(crop_variety=self.variety_jyothi, stage='germination', start_day=0, end_day=10)
        CropVarietyStageDuration.objects.create(crop_variety=self.variety_jyothi, stage='vegetative', start_day=11, end_day=45)
        CropVarietyStageDuration.objects.create(crop_variety=self.variety_jyothi, stage='flowering', start_day=46, end_day=75)
        CropVarietyStageDuration.objects.create(crop_variety=self.variety_jyothi, stage='fruiting', start_day=76, end_day=105)
        CropVarietyStageDuration.objects.create(crop_variety=self.variety_jyothi, stage='harvesting', start_day=106, end_day=None)

    # ─── PHASE 4: CROP & VARIETY TESTS ───────────────────────────────────────

    def test_retrieve_crops_from_database(self):
        response = self.client.get('/api/crop-types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        crop_names = [c['name'] for c in results]
        self.assertIn('Paddy Rice', crop_names)
        self.assertIn('Tomato', crop_names)

    def test_retrieve_varieties_filtered_by_crop(self):
        response = self.client.get(f'/api/crop-varieties/?crop_id={self.crop_rice.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        variety_names = [v['variety_name'] for v in results]
        self.assertIn('Jyothi Rice', variety_names)
        self.assertIn('Uma Rice', variety_names)
        self.assertNotIn('Arka Rakshak Tomato', variety_names)

    def test_variety_belonging_to_another_crop_rejected(self):
        # Validation test: assigning Tomato variety to Rice crop violates clean() model constraint
        invalid_req = CropWaterRequirement(
            crop=self.crop_rice,
            variety=self.variety_arka, # Tomato variety
            crop_stage='vegetative',
            min_water=10.0,
            optimal_water=15.0,
            max_water=20.0
        )
        with self.assertRaises(Exception):
            invalid_req.full_clean()

    # ─── PHASE 5: AUTOMATIC CROP STAGE TESTING ───────────────────────────────

    def test_crop_stage_calculation_germination(self):
        # 5 days after planting -> Germination (0-10 days)
        planting_date = date.today() - timedelta(days=5)
        stage_info = calculate_expected_crop_stage(crop_variety=self.variety_jyothi, planting_date=planting_date)
        self.assertEqual(stage_info['current_expected_stage'], 'germination')
        self.assertEqual(stage_info['days_after_planting'], 5)

    def test_crop_stage_calculation_vegetative(self):
        # 25 days after planting -> Vegetative (11-45 days)
        planting_date = date.today() - timedelta(days=25)
        stage_info = calculate_expected_crop_stage(crop_variety=self.variety_jyothi, planting_date=planting_date)
        self.assertEqual(stage_info['current_expected_stage'], 'vegetative')

    def test_crop_stage_calculation_flowering(self):
        # 60 days after planting -> Flowering (46-75 days)
        planting_date = date.today() - timedelta(days=60)
        stage_info = calculate_expected_crop_stage(crop_variety=self.variety_jyothi, planting_date=planting_date)
        self.assertEqual(stage_info['current_expected_stage'], 'flowering')

    def test_crop_stage_calculation_harvesting(self):
        # 120 days after planting -> Harvesting (106+ days)
        planting_date = date.today() - timedelta(days=120)
        stage_info = calculate_expected_crop_stage(crop_variety=self.variety_jyothi, planting_date=planting_date)
        self.assertEqual(stage_info['current_expected_stage'], 'harvesting')

    def test_future_planting_date_handling(self):
        # Future planting date (planted tomorrow) -> Germination (Day 0)
        planting_date = date.today() + timedelta(days=1)
        stage_info = calculate_expected_crop_stage(crop_variety=self.variety_jyothi, planting_date=planting_date)
        self.assertEqual(stage_info['days_after_planting'], 0)
        self.assertEqual(stage_info['current_expected_stage'], 'germination')
