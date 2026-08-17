from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    IrrigationHistoryViewSet, RainfallConfirmationViewSet,
    WaterSourceViewSet, WaterAllocationRequestViewSet,
    WaterAllocationViewSet, WaterUsageViewSet,
    water_manager_dashboard_summary, water_manager_reports
)

router = DefaultRouter()
router.register(r'irrigation', IrrigationHistoryViewSet, basename='irrigation')
router.register(r'rainfall', RainfallConfirmationViewSet, basename='rainfall')
router.register(r'water-sources', WaterSourceViewSet, basename='water-source')
router.register(r'water-allocation-requests', WaterAllocationRequestViewSet, basename='water-allocation-request')
router.register(r'water-allocations', WaterAllocationViewSet, basename='water-allocation')
router.register(r'water-usages', WaterUsageViewSet, basename='water-usage')

urlpatterns = [
    path('water-manager/dashboard/', water_manager_dashboard_summary, name='water-manager-dashboard'),
    path('water-manager/reports/', water_manager_reports, name='water-manager-reports'),
    path('', include(router.urls)),
]
