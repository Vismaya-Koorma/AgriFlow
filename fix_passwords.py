import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from accounts.models import User

ACCOUNTS_TO_FIX = [
    {'username': 'farmer', 'email': 'ramesh@agriflow.in', 'password': 'FarmerPassword123!', 'role': 'farmer'},
    {'username': 'supervisor', 'email': 'anil@agriflow.in', 'password': 'SupervisorPassword123!', 'role': 'supervisor'},
    {'username': 'manager', 'email': 'priya@agriflow.in', 'password': 'ManagerPassword123!', 'role': 'manager'},
    {'username': 'maintenance', 'email': 'suresh@agriflow.in', 'password': 'MaintenancePassword123!', 'role': 'maintenance'},
    {'username': 'admin', 'email': 'admin@agriflow.in', 'password': 'AdminPassword123!', 'role': 'admin'},
    {'username': 'vismaya', 'email': 'vismaya@agriflow.in', 'password': 'VismayaPassword123!', 'role': 'farmer'},
]

def run_fix():
    print("=== AgriFlow Password Reset Utility ===")
    for acc in ACCOUNTS_TO_FIX:
        uname = acc['username']
        email = acc['email']
        pwd = acc['password']
        role = acc['role']

        user = User.objects.filter(username=uname).first() or User.objects.filter(email=email).first()
        if not user:
            user = User(username=uname, email=email, role=role, full_name=uname.capitalize(), phone_number='9876543200')
            print(f"[CREATED] New user record for '{uname}'")

        user.set_password(pwd)
        user.is_active = True
        user.save()
        print(f"[UPDATED] {user.username:12} | email: {user.email:25} | password: {pwd:22} | check_password: {user.check_password(pwd)}")

if __name__ == '__main__':
    run_fix()
