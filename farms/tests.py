from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import date, timedelta
from farms.models import (
    Farm, Field, FieldInspectionCriterion, FieldInspection,
    FieldCriterionResult, FieldCorrectiveAction, FieldVerificationHistory
)
from field_visits.models import SupervisorFarmAssignment
from master.models import CropType, SoilType
from alerts.models import Alert

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
        self.assertEqual(response.status_code, 204)
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


class FieldInspectionCriteriaAndDecisionTests(TestCase):
    """
    Comprehensive tests covering all mandatory inspection requirements:
    - All mandatory criteria passing -> VERIFIED
    - Critical criterion failing -> REJECTED
    - Noncritical criterion failing -> NEEDS_IMPROVEMENT
    - Missing mandatory results -> 400 Bad Request
    - NOT APPLICABLE validation (requires observation) -> 400 Bad Request
    - Missing rejection reasons -> 400 Bad Request
    - Unauthorized supervisor requests -> 403 Forbidden
    - Farmer data isolation
    - Reinspection after rejection preserving historical records
    - Preventing direct status tampering without checklist
    - Corrective actions lifecycle
    - Farmer notifications
    """
    def setUp(self):
        self.farmer_a = User.objects.create_user(
            username='farmer_alice', email='alice@farm.com', password='Password123!', role='farmer'
        )
        self.farmer_b = User.objects.create_user(
            username='farmer_bob', email='bob@farm.com', password='Password123!', role='farmer'
        )
        self.assigned_supervisor = User.objects.create_user(
            username='supervisor_carol', email='carol@agri.com', password='Password123!', role='supervisor'
        )
        self.unassigned_supervisor = User.objects.create_user(
            username='supervisor_dave', email='dave@agri.com', password='Password123!', role='supervisor'
        )
        self.admin_user = User.objects.create_user(
            username='admin_boss', email='admin@agri.com', password='Password123!', role='admin'
        )

        self.crop = CropType.objects.create(name='Paddy')
        self.soil = SoilType.objects.create(name='Clay Loam')

        self.farm_a = Farm.objects.create(
            user=self.farmer_a, name='Alice Green Estate', location='Alappuzha', total_area=10.0
        )
        self.field_a = Field.objects.create(
            farm=self.farm_a, name='Paddy Plot 1', area=4.0, crop_type=self.crop, soil_type=self.soil
        )

        # Assign carol to farm_a
        SupervisorFarmAssignment.objects.create(
            supervisor=self.assigned_supervisor,
            farmer=self.farmer_a,
            farm=self.farm_a,
            field=self.field_a,
            weekly_visit_day=0,
            start_time='09:00:00',
            end_time='12:00:00',
            start_date=date.today(),
            is_active=True
        )

        # Clients
        self.assigned_client = APIClient()
        self.assigned_client.force_authenticate(user=self.assigned_supervisor)

        self.unassigned_client = APIClient()
        self.unassigned_client.force_authenticate(user=self.unassigned_supervisor)

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)

        self.farmer_a_client = APIClient()
        self.farmer_a_client.force_authenticate(user=self.farmer_a)

        self.farmer_b_client = APIClient()
        self.farmer_b_client.force_authenticate(user=self.farmer_b)

        # Seed test inspection criteria
        self.crit_canopy = FieldInspectionCriterion.objects.create(
            category=FieldInspectionCriterion.Category.CROP_HEALTH,
            name='Crop Canopy Vigour',
            is_mandatory=True,
            is_critical=False,
            order=1
        )
        self.crit_water = FieldInspectionCriterion.objects.create(
            category=FieldInspectionCriterion.Category.IRRIGATION_WATER,
            name='Water Source Reliability',
            is_mandatory=True,
            is_critical=True,
            order=2
        )
        self.crit_pest = FieldInspectionCriterion.objects.create(
            category=FieldInspectionCriterion.Category.PEST_DISEASE,
            name='Absence of Quarantine Epidemic',
            is_mandatory=True,
            is_critical=True,
            order=3
        )
        self.crit_weed = FieldInspectionCriterion.objects.create(
            category=FieldInspectionCriterion.Category.FIELD_MAINTENANCE,
            name='Weed Management',
            is_mandatory=True,
            is_critical=False,
            order=4
        )

    # 1. All mandatory criteria passing -> VERIFIED
    def test_all_mandatory_criteria_passing_leads_to_verified(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Uniform dense stand'},
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Canal branch full flow'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'No disease symptoms'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Bunds clean and weeded'}
            ],
            'overall_notes': 'Exemplary field management.'
        }
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['decision'], 'verified')

        self.field_a.refresh_from_db()
        self.assertEqual(self.field_a.verification_status, 'verified')
        self.assertEqual(self.field_a.verified_by, self.assigned_supervisor)

        # Check alert dispatched to farmer
        self.assertTrue(Alert.objects.filter(user=self.farmer_a, field=self.field_a, title__icontains='Verified').exists())

    # 2. Critical criterion failing -> REJECTED
    def test_critical_criterion_failing_leads_to_rejected(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Good colour'},
                {
                    'criterion_id': self.crit_water.id,
                    'result': 'fail',
                    'observation': 'Canal dry',
                    'failure_reason': 'Borewell pump completely burnt out with no secondary source',
                    'corrective_action': 'Repair submersible pump before irrigation schedule'
                },
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Clean'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Clean'}
            ],
            'reinspection_scheduled_date': '2026-11-15'
        }
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['decision'], 'rejected')

        self.field_a.refresh_from_db()
        self.assertEqual(self.field_a.verification_status, 'rejected')

        # Critical failure generated corrective action
        self.assertTrue(FieldCorrectiveAction.objects.filter(field=self.field_a, farmer=self.farmer_a).exists())

        # Notification dispatched
        self.assertTrue(Alert.objects.filter(user=self.farmer_a, severity=Alert.Severity.HIGH, title__icontains='Rejected').exists())

    # 3. Noncritical criterion failing -> NEEDS_IMPROVEMENT
    def test_noncritical_criterion_failing_leads_to_needs_improvement(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Good stand'},
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Water available'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'None'},
                {
                    'criterion_id': self.crit_weed.id,
                    'result': 'fail',
                    'observation': 'Weed patches visible',
                    'failure_reason': 'High density of Cyperus rotundus in sector 2',
                    'corrective_action': 'Perform manual weeding within 7 days'
                }
            ],
            'reinspection_scheduled_date': '2026-11-10'
        }
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['decision'], 'needs_improvement')

        self.field_a.refresh_from_db()
        self.assertEqual(self.field_a.verification_status, 'needs_improvement')

    # 4. Missing mandatory results -> 400 Bad Request
    def test_missing_mandatory_results_raises_error(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Stand ok'}
                # Missing crit_water, crit_pest, crit_weed
            ]
        }
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing mandatory', response.data['error'])

    # 5. NOT APPLICABLE validation requires explanation
    def test_not_applicable_without_observation_raises_error(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'not_applicable', 'observation': ''}, # Missing observation
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Ok'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Ok'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Ok'}
            ]
        }
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('NOT APPLICABLE', response.data['error'])

    # 6. Missing rejection reason on reject endpoint -> 400 Bad Request
    def test_missing_rejection_reason_raises_error(self):
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/reject/', {
            'rejection_reason': '   '
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rejection reason is mandatory', response.data['error'])

    # 7. Documented rejection succeeds
    def test_documented_rejection_succeeds(self):
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/reject/', {
            'rejection_reason': 'Severe bacterial leaf blight epidemic with yellow necrosis across 60% of crop.',
            'reinspection_scheduled_date': '2026-11-20'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.field_a.refresh_from_db()
        self.assertEqual(self.field_a.verification_status, 'rejected')
        self.assertTrue(FieldInspection.objects.filter(field=self.field_a, decision='rejected').exists())

    # 8. Non-supervisors (admin, farmer) denied inspection authority (403 Forbidden)
    def test_non_supervisor_requests_denied(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Ok'},
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Ok'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Ok'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Ok'}
            ]
        }
        # Admin is denied - inspection is strictly for supervisors
        response = self.admin_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Farmer is denied
        farmer_resp = self.farmer_a_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(farmer_resp.status_code, status.HTTP_403_FORBIDDEN)

        reject_resp = self.admin_client.post(f'/api/fields/{self.field_a.id}/reject/', {'rejection_reason': 'Reason'})
        self.assertEqual(reject_resp.status_code, status.HTTP_403_FORBIDDEN)

    # 9. Field Supervisors have authority across fields to inspect and verify
    def test_supervisor_can_inspect_and_verify(self):
        payload = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Good'}
            ]
        }
        response = self.unassigned_supervisor_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json') if hasattr(self, 'unassigned_supervisor_client') else self.unassigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['decision'], 'verified')

    # 10. Farmer data isolation: Farmer B cannot access Farmer A's field inspections
    def test_farmer_b_cannot_access_farmer_a_inspections(self):
        # Create an inspection for Field A first
        FieldInspection.objects.create(
            field=self.field_a, farm=self.farm_a, supervisor=self.assigned_supervisor,
            farmer=self.farmer_a, decision='verified', overall_notes='Passed'
        )

        response = self.farmer_b_client.get(f'/api/fields/{self.field_a.id}/inspections/')
        # Either 404 (because Field queryset filters by user farms) or 403
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Farmer A can view their own field's inspections
        resp_a = self.farmer_a_client.get(f'/api/fields/{self.field_a.id}/inspections/')
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_a.data['inspections']), 1)

    # 11. Reinspection after rejection updates status but preserves historical records
    def test_reinspection_after_rejection_preserves_history(self):
        # 1. Reject first
        payload_fail = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_water.id, 'result': 'fail', 'failure_reason': 'Canal closed', 'corrective_action': 'Await rotation'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Good'}
            ]
        }
        res1 = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload_fail, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['decision'], 'rejected')

        # 2. Reinspect after water restored
        payload_pass = {
            'criterion_results': [
                {'criterion_id': self.crit_canopy.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_water.id, 'result': 'pass', 'observation': 'Canal water flowing adequately'},
                {'criterion_id': self.crit_pest.id, 'result': 'pass', 'observation': 'Good'},
                {'criterion_id': self.crit_weed.id, 'result': 'pass', 'observation': 'Good'}
            ],
            'overall_notes': 'Deficiency rectified on reinspection.'
        }
        res2 = self.assigned_client.post(f'/api/fields/{self.field_a.id}/inspect/', payload_pass, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data['decision'], 'verified')

        self.field_a.refresh_from_db()
        self.assertEqual(self.field_a.verification_status, 'verified')

        # History preserved: both inspections exist in database
        inspections = FieldInspection.objects.filter(field=self.field_a).order_by('inspection_date')
        self.assertEqual(inspections.count(), 2)
        self.assertEqual(inspections.first().decision, 'rejected')
        self.assertEqual(inspections.last().decision, 'verified')
        self.assertTrue(inspections.last().is_reinspection)

        # Audit history preserved
        self.assertGreaterEqual(FieldVerificationHistory.objects.filter(field=self.field_a).count(), 2)

    # 12. Direct verification without checklist rejected
    def test_direct_verify_without_checklist_rejected(self):
        response = self.assigned_client.post(f'/api/fields/{self.field_a.id}/verify/', {'status': 'verified'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be verified directly', response.data['error'])

    # 13. Farmer can update corrective actions assigned to them
    def test_farmer_can_update_corrective_action(self):
        # Create corrective action
        insp = FieldInspection.objects.create(
            field=self.field_a, farm=self.farm_a, supervisor=self.assigned_supervisor,
            farmer=self.farmer_a, decision='needs_improvement'
        )
        ca = FieldCorrectiveAction.objects.create(
            field=self.field_a, inspection=insp, farmer=self.farmer_a,
            action_description='Remove weeds from southern border',
            status=FieldCorrectiveAction.Status.PENDING
        )

        # Farmer updates to in_progress
        patch_resp = self.farmer_a_client.patch(f'/api/corrective-actions/{ca.id}/', {
            'status': 'in_progress',
            'resolution_notes': 'Hired labour to clear weeds'
        })
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        ca.refresh_from_db()
        self.assertEqual(ca.status, 'in_progress')
        self.assertEqual(ca.resolution_notes, 'Hired labour to clear weeds')

        # Farmer B cannot update Farmer A's action
        b_resp = self.farmer_b_client.patch(f'/api/corrective-actions/{ca.id}/', {'status': 'resolved'})
        self.assertIn(b_resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
