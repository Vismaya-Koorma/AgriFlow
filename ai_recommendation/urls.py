from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIRecommendationViewSet

router = DefaultRouter()
router.register(r'ai', AIRecommendationViewSet, basename='ai-recommendation')

urlpatterns = [
    path('', include(router.urls)),
]
