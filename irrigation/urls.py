from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import IrrigationHistoryViewSet, RainfallConfirmationViewSet

router = DefaultRouter()
router.register(r'irrigation', IrrigationHistoryViewSet, basename='irrigation')
router.register(r'rainfall', RainfallConfirmationViewSet, basename='rainfall')

urlpatterns = [
    path('', include(router.urls)),
]
