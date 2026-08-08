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
