from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from farms.models import Farm, Field
from master.models import CropType, SoilType, CropVariety, CropWaterRequirement
from irrigation.models import IrrigationHistory
from alerts.models import Alert

User = get_user_model()

class IrrigationSystemTests(TestCase):
    def setUp(self):
        self.farmer_a = User.objects.create_user(
            username='irrigation_farmer_a',
            email='irrigation_a@test.com',
            password='Password123!',
            role='farmer'
        )
        self.farmer_b = User.objects.create_user(
            username='irrigation_farmer_b',
            email='irrigation_b@test.com',
            password='Password123!',
            role='farmer'
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.farmer_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.farmer_b)

        # Seed master models
        self.crop = CropType.objects.create(name='Paddy Rice Irrigation')
        self.variety = CropVariety.objects.create(crop=self.crop, variety_name='Jyothi Test Variety')
        self.soil = SoilType.objects.create(name='Loamy Test Soil')

        # Seed farm & field
        self.farm = Farm.objects.create(user=self.farmer_a, name='Irrigation Farm', location='Ernakulam', total_area=10.0)
        self.field = Field.objects.create(
            farm=self.farm,
            name='Sector 1 Field',
            area=5.0,
            crop_type=self.crop,
            crop_variety=self.variety,
            soil_type=self.soil,
            planting_date=date.today()
        )

        # Seed water requirement
        CropWaterRequirement.objects.create(
            crop=self.crop,
            variety=self.variety,
            crop_stage='germination',
            soil_type=self.soil,
            min_water=10.0,
            optimal_water=15.0,
            max_water=20.0
        )

    # ─── PHASE 7: IRRIGATION RECOMMENDATION & COMPLETION ─────────────────────

    def test_irrigation_recommendation_generation(self):
        response = self.client_a.get(f'/api/recommendation/latest/?field_id={self.field.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recommendation', response.data)
        self.assertIn('recommended_water_liters', response.data)
        self.assertIn('priority', response.data)

    def test_irrigation_completion_workflow(self):
        # 1. Create a pending irrigation alert
        irr_alert = Alert.objects.create(
            user=self.farmer_a,
            farm=self.farm,
            field=self.field,
            alert_type=Alert.AlertType.IRRIGATION,
            severity=Alert.Severity.HIGH,
            title="Urgent Irrigation Required",
            message="Apply 1500L water",
            is_resolved=False,
            status=Alert.Status.PENDING
        )

        # 2. Farmer completes irrigation via API
        response = self.client_a.post('/api/irrigation/', {
            'field': self.field.id,
            'volume_litres': 1500,
            'duration_minutes': 45,
            'status': 'completed',
            'method': 'drip',
            'water_source': 'canal'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Verify irrigation history recorded
        self.assertTrue(IrrigationHistory.objects.filter(field=self.field, volume_litres=1500).exists())

        # 4. Verify related alert auto-resolved
        irr_alert.refresh_from_db()
        self.assertTrue(irr_alert.is_resolved)
        self.assertEqual(irr_alert.status, 'resolved')

    def test_user_data_isolation_on_irrigation_history(self):
        # Create irrigation history for Farmer A
        hist = IrrigationHistory.objects.create(
            field=self.field,
            volume_litres=2000,
            duration_minutes=60,
            status='completed'
        )

        # Farmer B listing irrigation history should not see Farmer A's history
        response = self.client_b.get('/api/irrigation/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        hist_ids = [h['id'] for h in results]
        self.assertNotIn(hist.id, hist_ids)


class SupervisorWaterRequestVerificationTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='farmer_req_user', email='farmer_req@test.com', password='Password123!', role='farmer'
        )
        self.supervisor = User.objects.create_user(
            username='supervisor_req_user', email='supervisor_req@test.com', password='Password123!', role='supervisor'
        )

        self.farmer_client = APIClient()
        self.farmer_client.force_authenticate(user=self.farmer)

        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(user=self.supervisor)

        self.crop = CropType.objects.create(name='Paddy')
        self.soil = SoilType.objects.create(name='Loamy')
        self.farm = Farm.objects.create(user=self.farmer, name='Req Test Farm', location='Ernakulam', total_area=10.0)
        self.field = Field.objects.create(farm=self.farm, name='Req Field', area=3.0, crop_type=self.crop, soil_type=self.soil)

    def test_farmer_cannot_set_supervisor_status_on_create(self):
        response = self.farmer_client.post('/api/water-allocation-requests/', {
            'farm': self.farm.id,
            'field': self.field.id,
            'requested_amount_liters': '1000.00',
            'priority': 'medium',
            'supervisor_status': 'verified'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['supervisor_status'], 'pending_review')

    def test_farmer_cannot_call_supervisor_verify_endpoint(self):
        from irrigation.models import WaterAllocationRequest
        req = WaterAllocationRequest.objects.create(
            farmer=self.farmer, farm=self.farm, field=self.field, requested_amount_liters=1000.00
        )
        response = self.farmer_client.post(f'/api/water-allocation-requests/{req.id}/supervisor-verify/', {
            'status': 'verified',
            'notes': 'Farmer attempt'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_can_verify_water_request(self):
        from irrigation.models import WaterAllocationRequest
        req = WaterAllocationRequest.objects.create(
            farmer=self.farmer, farm=self.farm, field=self.field, requested_amount_liters=1000.00
        )
        response = self.supervisor_client.post(f'/api/water-allocation-requests/{req.id}/supervisor-verify/', {
            'status': 'verified',
            'notes': 'Ground truth checked by supervisor'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.supervisor_status, 'verified')
        self.assertEqual(req.supervisor_notes, 'Ground truth checked by supervisor')
        self.assertEqual(req.verified_by_supervisor, self.supervisor)
