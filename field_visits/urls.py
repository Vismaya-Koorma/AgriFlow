from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SupervisorFarmAssignmentViewSet,
    FarmVisitViewSet,
    FarmInspectionReportViewSet
)

router = DefaultRouter()
router.register(r'assignments', SupervisorFarmAssignmentViewSet, basename='field-visit-assignments')
router.register(r'visits', FarmVisitViewSet, basename='field-visits')
router.register(r'reports', FarmInspectionReportViewSet, basename='field-visit-reports')

urlpatterns = [
    path('', include(router.urls)),
]
