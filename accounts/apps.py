from django.apps import AppConfig
from django.db.models.signals import post_migrate


def auto_seed_users(sender, **kwargs):
    if sender.name != 'accounts':
        return
    try:
        from accounts.models import User
        demo_users = [
            {'username': 'farmer', 'email': 'ramesh@agriflow.in', 'full_name': 'Ramesh Kumar', 'role': 'farmer', 'password': 'farmer123', 'district': 'Alappuzha', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'supervisor', 'email': 'anil@agriflow.in', 'full_name': 'Anil Menon', 'role': 'supervisor', 'password': 'supervisor123', 'district': 'Ernakulam', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'manager', 'email': 'priya@agriflow.in', 'full_name': 'Priya Nair', 'role': 'manager', 'password': 'manager123', 'district': 'Thiruvananthapuram', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'maintenance', 'email': 'suresh@agriflow.in', 'full_name': 'Suresh Pillai', 'role': 'maintenance', 'password': 'maintenance123', 'district': 'Kollam', 'state': 'Kerala', 'terms_accepted': True},
            {'username': 'admin', 'email': 'admin@agriflow.in', 'full_name': 'AgriFlow Admin', 'role': 'admin', 'password': 'admin123', 'district': 'Thiruvananthapuram', 'state': 'Kerala', 'terms_accepted': True, 'is_staff': True, 'is_superuser': True},
        ]
        for data in demo_users:
            pwd = data.pop('password')
            user, _ = User.objects.get_or_create(username=data['username'], defaults=data)
            user.set_password(pwd)
            user.is_active = True
            user.save()
    except Exception:
        pass


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        post_migrate.connect(auto_seed_users, sender=self)
