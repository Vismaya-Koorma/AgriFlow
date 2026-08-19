from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DecisionIntelligenceViewSet

router = DefaultRouter()
router.register(r'', DecisionIntelligenceViewSet, basename='decision-intelligence')

urlpatterns = [
    path('', include(router.urls)),
]
