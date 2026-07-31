from rest_framework import viewsets, permissions
from .models import CropType, SoilType
from .serializers import CropTypeSerializer, SoilTypeSerializer


class CropTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve crop types."""
    queryset = CropType.objects.all()
    serializer_class = CropTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SoilTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve soil types."""
    queryset = SoilType.objects.all()
    serializer_class = SoilTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
