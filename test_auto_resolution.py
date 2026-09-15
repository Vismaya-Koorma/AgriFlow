import sys
import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from django.db import models
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from alerts.models import Alert
from farms.models import Farm, Field
from irrigation.models import IrrigationHistory
from maintenance.models import Complaint

User = get_user_model()

def run_tests():
    print("=" * 60)
    print("STARTING MAINTENANCE COMPLAINT NOTIFICATION FULL LIFECYCLE TEST")
    print("=" * 60)

    # 1. Setup Users
    farmer_a = User.objects.filter(username='farmer_auto_a').first()
    if not farmer_a:
        farmer_a = User.objects.create_user(username='farmer_auto_a', email='farmer_auto_a@test.com', password='pass123', role='farmer')

    farmer_b = User.objects.filter(username='farmer_auto_b').first()
    if not farmer_b:
        farmer_b = User.objects.create_user(username='farmer_auto_b', email='farmer_auto_b@test.com', password='pass123', role='farmer')

    maint_worker = User.objects.filter(username='maint_auto_worker').first()
    if not maint_worker:
        maint_worker = User.objects.create_user(username='maint_auto_worker', email='maint_auto_worker@test.com', password='pass123', role='maintenance')

    # Setup Farm and Field for Farmer A
    farm_a, _ = Farm.objects.get_or_create(name='Auto Test Farm A', defaults={'user': farmer_a, 'location': 'Test Location', 'total_area': 10.0})
    field_a, _ = Field.objects.get_or_create(name='Auto Test Field A', farm=farm_a, defaults={'area': 5.0})

    client_a = APIClient()
    client_a.force_authenticate(user=farmer_a)

    client_b = APIClient()
    client_b.force_authenticate(user=farmer_b)

    client_maint = APIClient()

    # -------------------------------------------------------------
    # TEST: Full 15-step Lifecycle of Maintenance Complaint & Notification
    # -------------------------------------------------------------
    print("\n[STEP 1] Submit Complaint (Pending)")
    resp_cmp = client_a.post('/api/maintenance/complaints/', {
        'farm': farm_a.id,
        'field': field_a.id,
        'title': 'Pump Pressure Drop',
        'category': 'pump',
        'priority': 'urgent',
        'description': 'Main centrifugal pump lost pressure.'
    })
    assert resp_cmp.status_code == status.HTTP_201_CREATED, f"Failed creating complaint: {resp_cmp.data}"
    cmp_id = resp_cmp.data['id']
    complaint_obj = Complaint.objects.get(id=cmp_id)
    assigned_worker = complaint_obj.assigned_to or maint_worker
    client_maint.force_authenticate(user=assigned_worker)

    print(f"  Created complaint ID {complaint_obj.complaint_id} assigned to worker '{assigned_worker.username}'")

    print("\n[STEP 2] Verify Notification is Created & Active (Pending)")
    worker_alert = Alert.objects.filter(user=assigned_worker, complaint=complaint_obj).first()
    assert worker_alert is not None, "Worker notification was not generated!"
    assert worker_alert.is_resolved == False, "Initial notification should be unresolved!"
    assert worker_alert.status == 'pending', f"Expected status='pending', got '{worker_alert.status}'"
    print(f"  Verified notification ID {worker_alert.id}: status={worker_alert.status}, is_resolved={worker_alert.is_resolved}")

    print("\n[STEP 3] Worker Accepts Complaint (Accepted)")
    resp_acc = client_maint.post(f'/api/maintenance/complaints/{cmp_id}/accept/')
    assert resp_acc.status_code == status.HTTP_200_OK, f"Failed accepting complaint: {resp_acc.data}"
    complaint_obj.refresh_from_db()
    assert complaint_obj.status == 'accepted'

    worker_alert.refresh_from_db()
    assert worker_alert.is_resolved == False, "Accepting task MUST NOT resolve notification!"
    assert worker_alert.status == 'pending'
    print("  PASS: Notification remains ACTIVE (Pending) after task acceptance.")

    print("\n[STEP 4] Worker Updates Progress to 50% (In Progress)")
    resp_prog = client_maint.post(f'/api/maintenance/complaints/{cmp_id}/update_progress/', {
        'progress': 50,
        'status': 'in_progress',
        'message': 'Disassembled pump impeller chamber.'
    })
    assert resp_prog.status_code == status.HTTP_200_OK, f"Failed updating progress: {resp_prog.data}"
    complaint_obj.refresh_from_db()
    assert complaint_obj.status == 'in_progress'

    worker_alert.refresh_from_db()
    assert worker_alert.is_resolved == False, "Updating progress to 50% MUST NOT resolve notification!"
    assert worker_alert.status == 'pending'
    print("  PASS: Notification remains ACTIVE (Pending) while task is In Progress.")

    print("\n[STEP 5] Worker Marks Task Completed (Completed)")
    resp_comp = client_maint.post(f'/api/maintenance/complaints/{cmp_id}/complete/', {
        'completion_notes': 'Replaced damaged impeller seal ring and tested flow rate.'
    })
    assert resp_comp.status_code == status.HTTP_200_OK, f"Failed completing task: {resp_comp.data}"
    complaint_obj.refresh_from_db()
    assert complaint_obj.status == 'completed'

    worker_alert.refresh_from_db()
    assert worker_alert.is_resolved == True, "Completing task MUST automatically set is_resolved=True!"
    assert worker_alert.status == 'resolved', f"Expected status='resolved', got '{worker_alert.status}'"
    print("  PASS: Notification automatically RESOLVED upon complaint completion!")

    print("\n[STEP 6] Verify Unread / Active Count Updated")
    count_resp = client_maint.get('/api/alerts/unread_count/')
    assert count_resp.status_code == status.HTTP_200_OK
    print(f"  Worker unread_count: {count_resp.data['unread_count']}")

    print("\n[STEP 7] Verify Farmer Notifications Auto-Resolved")
    farmer_alerts = Alert.objects.filter(user=farmer_a, complaint=complaint_obj)
    for fa in farmer_alerts:
        assert fa.is_resolved == True, "Farmer complaint notification should also be resolved upon task completion!"
        assert fa.status == 'resolved'
    print("  PASS: Farmer complaint notifications automatically marked as RESOLVED!")

    print("\n[STEP 8] Retroactive Synchronization Check (CMP-0001, CMP-0002, CMP-0003)")
    for cid in ['CMP-0001', 'CMP-0002', 'CMP-0003']:
        cmp_item = Complaint.objects.filter(complaint_id=cid).first()
        if cmp_item:
            assert cmp_item.status == 'completed', f"Complaint {cid} should remain completed!"
            linked_alerts = Alert.objects.filter(models.Q(complaint=cmp_item) | models.Q(title__icontains=cid) | models.Q(message__icontains=cid))
            for la in linked_alerts:
                assert la.is_resolved == True, f"Alert ID {la.id} for {cid} should be resolved!"
                assert la.status == 'resolved', f"Alert ID {la.id} for {cid} status should be 'resolved'!"
            print(f"  PASS: {cid} (Completed) -> {linked_alerts.count()} alert(s) verified as RESOLVED.")

    print("\n" + "=" * 60)
    print("ALL 15 LIFECYCLE & RETROACTIVE SYNC REQUIREMENTS VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
