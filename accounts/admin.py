from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LoginLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'state', 'district')
    search_fields = ('username', 'email', 'full_name', 'phone_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'email', 'phone_number', 'district', 'state')}),
        ('Roles & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'terms_accepted')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_at', 'ip_address', 'success')
    list_filter = ('success',)
    search_fields = ('user__username', 'ip_address')
    ordering = ('-login_at',)
