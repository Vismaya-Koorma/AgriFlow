from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import CropTypeViewSet, SoilTypeViewSet

router = DefaultRouter()
router.register(r'crop-types', CropTypeViewSet, basename='croptype')
router.register(r'soil-types', SoilTypeViewSet, basename='soiltype')

urlpatterns = [
    path('', include(router.urls)),
]
