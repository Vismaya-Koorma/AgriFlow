from datetime import date, time, timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from farms.models import Farm, Field
from master.models import CropType, SoilType
from field_visits.models import (
    SupervisorFarmAssignment,
    RecurringFarmVisitSchedule,
    FarmVisit,
    FarmInspectionReport,
    ScheduleChangeHistory
)
from field_visits.services import (
    validate_schedule_conflict,
    generate_scheduled_visits_for_window,
    mark_missed_visits
)


class FieldVisitsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            full_name='Test Admin',
            password='Password123!'
        )

        # Create Supervisor 1 & 2
        self.supervisor1 = User.objects.create_user(
            username='supervisor_one',
            email='sup1@test.com',
            full_name='Supervisor Alpha',
            phone_number='9876543210',
            role='supervisor',
            password='Password123!'
        )
        self.supervisor2 = User.objects.create_user(
            username='supervisor_two',
            email='sup2@test.com',
            full_name='Supervisor Beta',
            phone_number='9876543211',
            role='supervisor',
            password='Password123!'
        )

        # Create Farmers
        self.farmer1 = User.objects.create_user(
            username='farmer_one',
            email='farmer1@test.com',
            full_name='Farmer Ram',
            phone_number='9123456780',
            role='farmer',
            password='Password123!'
        )
        self.farmer2 = User.objects.create_user(
            username='farmer_two',
            email='farmer2@test.com',
            full_name='Farmer Shyam',
            phone_number='9123456781',
            role='farmer',
            password='Password123!'
        )

        # Create Farms
        self.farm1 = Farm.objects.create(
            user=self.farmer1,
            name='Green Acres',
            location='Kottayam',
            district='Kottayam',
            total_area=5.0
        )
        self.farm2 = Farm.objects.create(
            user=self.farmer2,
            name='Sunrise Valley',
            location='Pala',
            district='Kottayam',
            total_area=8.0
        )

    def test_assignment_creation_and_recurring_schedule(self):
        """Admin creates a supervisor farm assignment and recurring schedule is created."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'supervisor': self.supervisor1.id,
            'farmer': self.farmer1.id,
            'farm': self.farm1.id,
            'weekly_visit_day': 0,  # Monday
            'start_time': '09:00:00',
            'end_time': '12:00:00',
            'start_date': date.today().isoformat(),
            'is_active': True
        }
        resp = self.client.post('/api/field-visits/assignments/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SupervisorFarmAssignment.objects.filter(farm=self.farm1).exists())
        assignment = SupervisorFarmAssignment.objects.get(farm=self.farm1)
        self.assertTrue(RecurringFarmVisitSchedule.objects.filter(assignment=assignment).exists())
        self.assertTrue(ScheduleChangeHistory.objects.filter(assignment=assignment, change_type='CREATED').exists())

    def test_schedule_conflict_prevention(self):
        """Prevent overlapping visit slots for the same supervisor on the same weekday."""
        # Create first assignment: Monday 09:00 - 12:00
        SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=0,
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today(),
            is_active=True
        )

        # Attempt overlapping slot for same supervisor: Monday 10:00 - 13:00 on farm2
        with self.assertRaises(ValidationError):
            validate_schedule_conflict(
                supervisor=self.supervisor1,
                weekly_visit_day=0,
                start_time=time(10, 0),
                end_time=time(13, 0)
            )

        # Non-overlapping slot on same day (e.g. 13:00 - 16:00) should pass
        no_conflict = validate_schedule_conflict(
            supervisor=self.supervisor1,
            weekly_visit_day=0,
            start_time=time(13, 0),
            end_time=time(16, 0)
        )
        self.assertTrue(no_conflict)

    def test_rolling_schedule_generation_and_deduplication(self):
        """Generator creates visits for 4 weeks and rerunning creates 0 duplicates."""
        assignment = SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=date.today().weekday(),  # Same day as today
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today(),
            is_active=True
        )

        count1 = generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=4)
        self.assertGreater(count1, 0)
        initial_visits_count = FarmVisit.objects.filter(assignment=assignment).count()

        # Rerun generator: must create 0 duplicates
        count2 = generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=4)
        self.assertEqual(count2, 0)
        self.assertEqual(FarmVisit.objects.filter(assignment=assignment).count(), initial_visits_count)

    def test_visit_start_and_completion_lifecycle(self):
        """Supervisor starts visit, completes it with 13 inspection fields, updates last_actual_visit_date."""
        assignment = SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=date.today().weekday(),
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today(),
            is_active=True
        )
        generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=1)
        visit = FarmVisit.objects.filter(assignment=assignment).first()
        self.assertIsNotNone(visit)
        self.assertEqual(visit.status, FarmVisit.Status.SCHEDULED)

        # 1. Start Visit as Supervisor 1
        self.client.force_authenticate(user=self.supervisor1)
        start_resp = self.client.post(f'/api/field-visits/visits/{visit.id}/start/')
        self.assertEqual(start_resp.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.status, FarmVisit.Status.IN_PROGRESS)
        self.assertIsNotNone(visit.actual_start_time)

        # 2. Complete Visit with 13 inspection fields
        inspection_payload = {
            'crop_condition': 'Good',
            'crop_growth_stage': 'Vegetative',
            'soil_and_field_observations': 'Loamy soil with adequate moisture retention.',
            'irrigation_system_status': 'Functional',
            'water_availability_and_observations': 'Canal water flow adequate, no visible clogs.',
            'pest_or_disease_symptoms': 'Minor leaf spot observed on south edge.',
            'fertilizer_or_pesticide_observations': 'Organic compost applied 5 days ago.',
            'recommended_agricultural_actions': 'Apply neem oil spray in the evening; schedule next watering in 4 days.',
            'maintenance_issues': 'None',
            'follow_up_required': True,
            'follow_up_notes': 'Check if leaf spotting has ceased.',
            'next_recommended_visit_date': (date.today() + timedelta(days=7)).isoformat(),
            'additional_remarks': 'Farmer advised to keep records of rainfall.'
        }
        complete_resp = self.client.post(f'/api/field-visits/visits/{visit.id}/complete/', inspection_payload, format='json')
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)

        visit.refresh_from_db()
        self.assertEqual(visit.status, FarmVisit.Status.COMPLETED)
        self.assertIsNotNone(visit.actual_end_time)

        # Check inspection report created
        self.assertTrue(FarmInspectionReport.objects.filter(visit=visit).exists())
        report = FarmInspectionReport.objects.get(visit=visit)
        self.assertEqual(report.crop_condition, 'Good')
        self.assertTrue(report.follow_up_required)

        # Check last actual visit date updated on assignment
        assignment.refresh_from_db()
        self.assertIsNotNone(assignment.last_actual_visit_date)

    def test_farmer_data_isolation(self):
        """Farmer 2 cannot view or start Farmer 1's visit."""
        assignment = SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=date.today().weekday(),
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today(),
            is_active=True
        )
        generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=1)
        visit = FarmVisit.objects.filter(assignment=assignment).first()

        # Farmer 2 logs in
        self.client.force_authenticate(user=self.farmer2)
        resp = self.client.get('/api/field-visits/visits/')
        # Should not see Farmer 1's visit in queryset
        results_list = resp.data.get('results') if isinstance(resp.data, dict) else resp.data
        self.assertNotIn(visit.id, [v['id'] for v in results_list])

        # Farmer 1 cannot start a visit (only supervisor can)
        self.client.force_authenticate(user=self.farmer1)
        forbidden_start = self.client.post(f'/api/field-visits/visits/{visit.id}/start/')
        self.assertEqual(forbidden_start.status_code, status.HTTP_403_FORBIDDEN)

    def test_reschedule_and_cancel_rules(self):
        """Rescheduling preserves history; cancelling requires reason."""
        assignment = SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=date.today().weekday(),
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today(),
            is_active=True
        )
        generate_scheduled_visits_for_window(assignment_id=assignment.id, weeks_ahead=1)
        visit = FarmVisit.objects.filter(assignment=assignment).first()

        self.client.force_authenticate(user=self.supervisor1)
        new_date = (date.today() + timedelta(days=2)).isoformat()
        reschedule_resp = self.client.post(f'/api/field-visits/visits/{visit.id}/reschedule/', {
            'new_date': new_date,
            'reason': 'Heavy rain predicted in the area'
        }, format='json')
        self.assertEqual(reschedule_resp.status_code, status.HTTP_200_OK)

        visit.refresh_from_db()
        self.assertEqual(visit.status, FarmVisit.Status.RESCHEDULED)
        self.assertEqual(visit.rescheduled_reason, 'Heavy rain predicted in the area')
        self.assertIsNotNone(visit.rescheduled_from_date)

        # Cancel visit without reason should fail
        cancel_no_reason = self.client.post(f'/api/field-visits/visits/{visit.id}/cancel/', {})
        self.assertEqual(cancel_no_reason.status_code, status.HTTP_400_BAD_REQUEST)

        # Cancel visit with reason
        cancel_resp = self.client.post(f'/api/field-visits/visits/{visit.id}/cancel/', {
            'reason': 'Farmer unavailable due to family emergency'
        }, format='json')
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.status, FarmVisit.Status.CANCELLED)
        self.assertIsNotNone(visit.cancelled_at)

    def test_mark_missed_visits(self):
        """Past scheduled visits are marked as MISSED."""
        assignment = SupervisorFarmAssignment.objects.create(
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            weekly_visit_day=0,
            start_time=time(9, 0),
            end_time=time(12, 0),
            start_date=date.today() - timedelta(days=14),
            is_active=True
        )
        past_visit = FarmVisit.objects.create(
            assignment=assignment,
            supervisor=self.supervisor1,
            farmer=self.farmer1,
            farm=self.farm1,
            scheduled_date=date.today() - timedelta(days=7),
            scheduled_start_time=time(9, 0),
            scheduled_end_time=time(12, 0),
            status=FarmVisit.Status.SCHEDULED,
            unique_occurrence_key=f"{assignment.id}_{(date.today() - timedelta(days=7)).isoformat()}"
        )
        missed_count = mark_missed_visits()
        self.assertGreaterEqual(missed_count, 1)
        past_visit.refresh_from_db()
        self.assertEqual(past_visit.status, FarmVisit.Status.MISSED)

