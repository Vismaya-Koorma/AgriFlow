from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CropHealthViewSet

router = DefaultRouter()
router.register(r'crop-health', CropHealthViewSet, basename='crop-health')

urlpatterns = [
    path('', include(router.urls)),
]
