from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, TokenRefreshAPIView,
    ProfileView, ChangePasswordView, DashboardView,
)
from .admin_views import (
    AdminDashboardSummaryView, AdminUserViewSet, AdminFarmOverviewView, AdminActivityLogView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/refresh/', TokenRefreshAPIView.as_view(), name='auth-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # Admin Platform & Management Endpoints
    path('admin/dashboard/summary/', AdminDashboardSummaryView.as_view(), name='admin-dashboard-summary'),
    path('admin/farms-overview/', AdminFarmOverviewView.as_view(), name='admin-farms-overview'),
    path('admin/activity-log/', AdminActivityLogView.as_view(), name='admin-activity-log'),
    path('admin/users/', AdminUserViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-users-list'),
    path('admin/users/<int:pk>/', AdminUserViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-users-detail'),
    path('admin/users/<int:pk>/change-role/', AdminUserViewSet.as_view({'patch': 'change_role'}), name='admin-users-change-role'),
    path('admin/users/<int:pk>/status/', AdminUserViewSet.as_view({'patch': 'toggle_status'}), name='admin-users-status'),
    path('admin/users/<int:pk>/toggle-status/', AdminUserViewSet.as_view({'patch': 'toggle_status'}), name='admin-users-toggle-status'),
]


