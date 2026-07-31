from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ComplaintViewSet, ComplaintUpdateViewSet

router = DefaultRouter()
router.register(r'complaints', ComplaintViewSet, basename='complaint')
router.register(r'complaint-updates', ComplaintUpdateViewSet, basename='complaint-update')

urlpatterns = [
    path('', include(router.urls)),
]
