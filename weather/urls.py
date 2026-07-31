from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import WeatherDataViewSet

router = DefaultRouter()
router.register(r'weather', WeatherDataViewSet, basename='weather')

urlpatterns = [
    path('', include(router.urls)),
]
