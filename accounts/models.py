from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """tbl_user — Custom user model for AgriFlow."""

    class Role(models.TextChoices):
        FARMER = 'farmer', 'Farmer'
        SUPERVISOR = 'supervisor', 'Supervisor'
        MANAGER = 'manager', 'Water Manager'
        MAINTENANCE = 'maintenance', 'Maintenance'
        ADMIN = 'admin', 'Admin'

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, default='Kerala')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FARMER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    class Meta:
        db_table = 'tbl_user'
        verbose_name = 'User'

    def __str__(self):
        return f"{self.username} ({self.role})"


class LoginLog(models.Model):
    """tbl_login — Tracks login history."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_logs')
    login_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=True)

    class Meta:
        db_table = 'tbl_login'
        verbose_name = 'Login Log'
        ordering = ['-login_at']

    def __str__(self):
        return f"{self.user.username} @ {self.login_at}"


class AdminActivityLog(models.Model):
    """tbl_admin_activity_log — Tracks administrative actions for audit."""

    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_actions')
    action = models.CharField(max_length=100, help_text="e.g. User Created, Role Changed, Status Updated, User Deleted")
    target_user_info = models.CharField(max_length=255, help_text="Username or info of affected user")
    details = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_admin_activity_log'
        verbose_name = 'Admin Activity Log'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.admin.username}: {self.action} on {self.target_user_info} @ {self.created_at}"

