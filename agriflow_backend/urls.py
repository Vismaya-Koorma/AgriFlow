from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import root_view, health_check_view

urlpatterns = [
    # System endpoints
    path('', root_view, name='root'),
    path('api/health/', health_check_view, name='health-check'),

    # Django Admin
    path('admin/', admin.site.urls),

    # Authentication Endpoints
    path('api/', include('accounts.urls')),

    # Feature App Endpoints
    path('api/', include('master.urls')),
    path('api/', include('farms.urls')),
    path('api/', include('weather.urls')),
    path('api/', include('irrigation.urls')),
    path('api/', include('recommendation.urls')),
    path('api/', include('ai_recommendation.urls')),
    path('api/', include('crop_health.urls')),
    path('api/', include('alerts.urls')),
    path('api/', include('maintenance.urls')),
    path('api/', include('reports.urls')),

    # JWT Token Refresh
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
