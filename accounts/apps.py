from django.apps import AppConfig
from django.db.models.signals import post_migrate


def auto_seed_users(sender=None, **kwargs):
    if sender is not None and getattr(sender, 'name', None) != 'accounts':
        return
    try:
        from accounts.models import User
        demo_users = [
            {'username': 'farmer', 'email': 'ramesh@agriflow.in', 'full_name': 'Ramesh Kumar', 'phone_number': '9876543201', 'role': 'farmer', 'password': 'FarmerPassword123!', 'district': 'Alappuzha', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'supervisor', 'email': 'anil@agriflow.in', 'full_name': 'Anil Menon', 'phone_number': '9876543202', 'role': 'supervisor', 'password': 'SupervisorPassword123!', 'district': 'Ernakulam', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'manager', 'email': 'priya@agriflow.in', 'full_name': 'Priya Nair', 'phone_number': '9876543203', 'role': 'manager', 'password': 'ManagerPassword123!', 'district': 'Thiruvananthapuram', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'maintenance', 'email': 'suresh@agriflow.in', 'full_name': 'Suresh Pillai', 'phone_number': '9876543204', 'role': 'maintenance', 'password': 'MaintenancePassword123!', 'district': 'Kollam', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'admin', 'email': 'admin@agriflow.in', 'full_name': 'AgriFlow Admin', 'phone_number': '9876543205', 'role': 'admin', 'password': 'AdminPassword123!', 'district': 'Thiruvananthapuram', 'state': 'Kerala', 'terms_accepted': True, 'is_staff': True, 'is_superuser': True},
        ]
        for item in demo_users:
            data = item.copy()
            username = data.pop('username')
            pwd = data.pop('password')
            email = data.get('email')
            user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
            if not user:
                user = User(username=username)
            for k, v in data.items():
                setattr(user, k, v)
            user.set_password(pwd)
            user.is_active = True
            user.save()
    except Exception as e:
        print("Auto seed error:", e)


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        post_migrate.connect(auto_seed_users, sender=self)
