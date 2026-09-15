from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    CropTypeViewSet, SoilTypeViewSet,
    CropVarietyViewSet, CropWaterRequirementViewSet
)

router = DefaultRouter()
router.register(r'crop-types', CropTypeViewSet, basename='croptype')
router.register(r'soil-types', SoilTypeViewSet, basename='soiltype')
router.register(r'crop-varieties', CropVarietyViewSet, basename='cropvariety')
router.register(r'crop-water-requirements', CropWaterRequirementViewSet, basename='cropwaterrequirement')

urlpatterns = [
    path('', include(router.urls)),
]

