from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ReportViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]
