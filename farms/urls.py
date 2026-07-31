from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import FarmViewSet, FieldViewSet

router = DefaultRouter()
router.register(r'farms', FarmViewSet, basename='farm')
router.register(r'fields', FieldViewSet, basename='field')

urlpatterns = [
    path('', include(router.urls)),
]
