import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from alerts.models import Alert
from farms.models import Farm, Field
from maintenance.models import Complaint
from django.utils import timezone


def run_tests():
    print("=" * 60)
    print("RUNNING AGRIFLOW NOTIFICATION SYSTEM SECURITY & ISOLATION TESTS")
    print("=" * 60)

    # 1. Setup Test Users
    user_a, _ = User.objects.get_or_create(username='test_farmer_a', defaults={'email': 'farmer_a@test.com', 'role': 'farmer'})
    user_b, _ = User.objects.get_or_create(username='test_farmer_b', defaults={'email': 'farmer_b@test.com', 'role': 'farmer'})
    maint_user, _ = User.objects.get_or_create(username='test_maint_worker', defaults={'email': 'maint@test.com', 'role': 'maintenance'})
    admin_user, _ = User.objects.get_or_create(username='test_admin_user', defaults={'email': 'admin@test.com', 'role': 'admin'})

    client_a = APIClient()
    client_a.force_authenticate(user=user_a)

    client_b = APIClient()
    client_b.force_authenticate(user=user_b)

    client_maint = APIClient()
    client_maint.force_authenticate(user=maint_user)

    client_admin = APIClient()
    client_admin.force_authenticate(user=admin_user)

    # -------------------------------------------------------------
    # TEST 1 & 2 & 3: User A and User B notification isolation
    # -------------------------------------------------------------
    print("\n[TEST 1, 2, 3] User Notification Isolation...")
    # Clear previous test alerts for clean state
    Alert.objects.filter(user__in=[user_a, user_b, maint_user, admin_user]).delete()

    alert_a = Alert.objects.create(
        user=user_a,
        title="User A Special Alert",
        message="Confidential alert for Farmer A",
        alert_type="system",
        severity="high"
    )

    # User A requests alerts
    res_a = client_a.get('/api/alerts/', format='json')
    alerts_a = res_a.data.get('results', res_a.data) if isinstance(res_a.data, dict) else res_a.data
    alerts_a_titles = [a['title'] for a in alerts_a]
    assert "User A Special Alert" in alerts_a_titles, "User A should see User A's alert"
    print("  [OK] TEST 1 PASSED: User A sees User A's alert.")

    # User B requests alerts
    res_b = client_b.get('/api/alerts/', format='json')
    assert res_b.status_code == 200, f"Failed GET for User B: {res_b.status_code}"
    alerts_b = res_b.data.get('results', res_b.data) if isinstance(res_b.data, dict) else res_b.data
    alerts_b_titles = [a['title'] for a in alerts_b]
    assert "User A Special Alert" not in alerts_b_titles, "SECURITY BREACH: User B must NEVER see User A's alert!"
    print("  [OK] TEST 2 PASSED: User B does NOT see User A's alert.")

    # Create alert for User B
    alert_b = Alert.objects.create(
        user=user_b,
        title="User B Special Alert",
        message="Confidential alert for Farmer B",
        alert_type="weather",
        severity="medium"
    )

    res_b2 = client_b.get('/api/alerts/', format='json')
    alerts_b2 = res_b2.data.get('results', res_b2.data) if isinstance(res_b2.data, dict) else res_b2.data
    alerts_b2_titles = [a['title'] for a in alerts_b2]
    assert "User B Special Alert" in alerts_b2_titles, "User B should see User B's alert"

    res_a2 = client_a.get('/api/alerts/', format='json')
    alerts_a2 = res_a2.data.get('results', res_a2.data) if isinstance(res_a2.data, dict) else res_a2.data
    alerts_a2_titles = [a['title'] for a in alerts_a2]
    assert "User B Special Alert" not in alerts_a2_titles, "SECURITY BREACH: User A must NEVER see User B's alert!"
    print("  [OK] TEST 3 PASSED: User B sees User B's alert, User A does NOT see User B's alert.")

    # -------------------------------------------------------------
    # TEST 4: Unread Count & Resolution
    # -------------------------------------------------------------
    print("\n[TEST 4] Unread Count & Mark as Read...")
    count_res_a = client_a.get('/api/alerts/unread_count/', format='json')
    assert count_res_a.status_code == 200
    assert count_res_a.data['unread_count'] == 1, f"Expected 1 unread alert for User A, got {count_res_a.data['unread_count']}"

    # User A resolves their alert
    resolve_res = client_a.post(f'/api/alerts/{alert_a.id}/resolve/', format='json')
    assert resolve_res.status_code == 200, f"Failed to resolve alert: {resolve_res.data}"

    count_res_a_after = client_a.get('/api/alerts/unread_count/', format='json')
    assert count_res_a_after.data['unread_count'] == 0, "Unread count should be 0 after marking resolved"
    print("  [OK] TEST 4 PASSED: Unread count updated from 1 to 0 after resolution.")

    # Security check: User B attempting to resolve User A's alert or non-existent
    resolve_unauth = client_b.post(f'/api/alerts/{alert_a.id}/resolve/', format='json')
    assert resolve_unauth.status_code in [403, 404], "User B must not be allowed to resolve User A's alert!"
    print("  [OK] SECURITY VERIFIED: Cross-user resolution attempt blocked.")

    # -------------------------------------------------------------
    # TEST 5: Multi-Role Dashboard Compatibility
    # -------------------------------------------------------------
    print("\n[TEST 5] Dashboard Compatibility Across User Roles...")
    roles_to_test = [
        ('Farmer', client_a, user_a),
        ('Maintenance', client_maint, maint_user),
        ('Admin', client_admin, admin_user)
    ]
    for role_name, client, u in roles_to_test:
        r = client.get('/api/alerts/unread_count/', format='json')
        assert r.status_code == 200, f"{role_name} unread_count endpoint failed"
        r_list = client.get('/api/alerts/', format='json')
        assert r_list.status_code == 200, f"{role_name} list endpoint failed"
        print(f"  [OK] {role_name} Dashboard unread_count & list APIs working properly.")

    # -------------------------------------------------------------
    # TEST 6: Irrigation Notification Delivery
    # -------------------------------------------------------------
    print("\n[TEST 6] Irrigation Notification Delivery...")
    from alerts.services import create_irrigation_notification
    farm_a, _ = Farm.objects.get_or_create(user=user_a, defaults={'name': 'Farm A', 'total_area': 10.0})
    field_a, _ = Field.objects.get_or_create(farm=farm_a, name='Field A1', defaults={'area': 5.0})

    irr_alert = create_irrigation_notification(
        field=field_a,
        priority='HIGH',
        recommended_water_liters=25000,
        recommendation_title='Urgent Irrigation'
    )
    assert irr_alert is not None, "Failed to create irrigation alert"
    assert irr_alert.user == user_a, "Irrigation alert must be assigned to field owner user_a"
    print("  [OK] TEST 6 PASSED: Irrigation notifications created & delivered to target user.")

    # -------------------------------------------------------------
    # TEST 7: Maintenance Workflow Notifications
    # -------------------------------------------------------------
    print("\n[TEST 7] Maintenance Workflow Notifications...")

    # Farmer A submits a complaint
    complaint_res = client_a.post('/api/maintenance/complaints/', {
        'title': 'Leaking Pipe on Field A1',
        'description': 'Main valve leaking water rapidly.',
        'priority': 'high',
        'assigned_to': maint_user.id
    }, format='json')
    assert complaint_res.status_code in [200, 201], f"Failed to submit complaint: {complaint_res.data}"
    complaint_id = complaint_res.data['id']

    # Verify maintenance worker received notification
    res_maint_alerts = client_maint.get('/api/alerts/', format='json')
    maint_alerts = res_maint_alerts.data.get('results', res_maint_alerts.data) if isinstance(res_maint_alerts.data, dict) else res_maint_alerts.data
    maint_titles = [a['title'] for a in maint_alerts]
    assert any("Maintenance Complaint" in t or "Maintenance Task" in t for t in maint_titles), "Maintenance worker should receive complaint notification"
    print("  [OK] Farmer complaint submission -> Maintenance worker notified.")

    # Maintenance worker completes complaint
    comp_complete_res = client_maint.post(f'/api/complaints/{complaint_id}/complete/', {
        'completion_notes': 'Repaired main valve gasket.'
    }, format='json')
    assert comp_complete_res.status_code == 200, f"Failed to complete complaint: {comp_complete_res.data}"

    # Verify farmer received completion notification
    res_farmer_alerts = client_a.get('/api/alerts/', format='json')
    farmer_alerts = res_farmer_alerts.data.get('results', res_farmer_alerts.data) if isinstance(res_farmer_alerts.data, dict) else res_farmer_alerts.data
    farmer_titles = [a['title'] for a in farmer_alerts]
    assert any("Maintenance Completed" in t for t in farmer_titles), "Farmer should receive completion notification"
    print("  [OK] Maintenance completion -> Farmer notified.")

    print("\n" + "=" * 60)
    print("ALL 7 AGRIFLOW NOTIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == '__main__':
    run_tests()
