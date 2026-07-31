from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, TokenRefreshAPIView,
    ProfileView, ChangePasswordView, DashboardView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/refresh/', TokenRefreshAPIView.as_view(), name='auth-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]
