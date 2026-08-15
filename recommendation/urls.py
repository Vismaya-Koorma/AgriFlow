from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    SoilMoistureViewSet, RecommendationViewSet,
    CropStressViewSet, WaterRequirementViewSet, IrrigationPriorityViewSet,
)

router = DefaultRouter()
router.register(r'soil-moisture', SoilMoistureViewSet, basename='soil-moisture')
router.register(r'recommendation', RecommendationViewSet, basename='recommendation')
router.register(r'crop-stress', CropStressViewSet, basename='crop-stress')
router.register(r'water-requirement', WaterRequirementViewSet, basename='water-requirement')
router.register(r'irrigation-priority', IrrigationPriorityViewSet, basename='irrigation-priority')

urlpatterns = [
    path('', include(router.urls)),
]
