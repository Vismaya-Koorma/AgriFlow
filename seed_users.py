import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from accounts.models import User

demo_users = [
    {
        'username': 'farmer',
        'email': 'ramesh@agriflow.in',
        'full_name': 'Ramesh Kumar',
        'role': 'farmer',
        'password': 'farmer123',
        'district': 'Alappuzha',
        'state': 'Kerala',
        'terms_accepted': True,
    },
    {
        'username': 'supervisor',
        'email': 'anil@agriflow.in',
        'full_name': 'Anil Menon',
        'role': 'supervisor',
        'password': 'supervisor123',
        'district': 'Ernakulam',
        'state': 'Kerala',
        'terms_accepted': True,
    },
    {
        'username': 'manager',
        'email': 'priya@agriflow.in',
        'full_name': 'Priya Nair',
        'role': 'manager',
        'password': 'manager123',
        'district': 'Thiruvananthapuram',
        'state': 'Kerala',
        'terms_accepted': True,
    },
    {
        'username': 'maintenance',
        'email': 'suresh@agriflow.in',
        'full_name': 'Suresh Pillai',
        'role': 'maintenance',
        'password': 'maintenance123',
        'district': 'Kollam',
        'state': 'Kerala',
        'terms_accepted': True,
    },
    {
        'username': 'admin',
        'email': 'admin@agriflow.in',
        'full_name': 'AgriFlow Admin',
        'role': 'admin',
        'password': 'admin123',
        'district': 'Thiruvananthapuram',
        'state': 'Kerala',
        'terms_accepted': True,
        'is_staff': True,
        'is_superuser': True,
    },
]

for data in demo_users:
    password = data.pop('password')
    user, created = User.objects.get_or_create(
        username=data['username'],
        defaults=data,
    )
    if not created:
        for key, value in data.items():
            setattr(user, key, value)
    user.set_password(password)
    user.is_active = True
    user.save()
    print(f"{'Created' if created else 'Updated'} user: {user.username} / password: {password}")

print(f"Total users: {User.objects.count()}")
