from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    FarmViewSet, FieldViewSet, FieldInspectionCriterionViewSet,
    FieldCorrectiveActionViewSet
)

router = DefaultRouter()
router.register(r'farms', FarmViewSet, basename='farm')
router.register(r'fields', FieldViewSet, basename='field')
router.register(r'inspection-criteria', FieldInspectionCriterionViewSet, basename='inspection-criteria')
router.register(r'corrective-actions', FieldCorrectiveActionViewSet, basename='corrective-actions')

urlpatterns = [
    path('', include(router.urls)),
]
