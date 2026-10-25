import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from rest_framework_simplejwt.views import TokenRefreshView
from .views import root_view, health_check_view

from accounts.views import GoogleOAuthCallbackView

urlpatterns = [
    # System endpoints
    path('', root_view, name='root'),
    path('api/health/', health_check_view, name='health-check'),

    # Direct Google OAuth Redirect Callback Endpoint
    path('accounts/google/login/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),

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
    path('api/alerts/', include('alerts.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    path('api/', include('reports.urls')),
    path('api/decision-intelligence/', include('decision_intelligence.urls')),
    path('api/field-visits/', include('field_visits.urls')),

    # JWT Token Refresh
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Media and uploaded file serving
    re_path(r'^complaints/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'complaints')}),
    re_path(r'^crop_health_leaves/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'crop_health_leaves')}),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
