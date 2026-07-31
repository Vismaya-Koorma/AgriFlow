from rest_framework import viewsets, permissions
from .models import Complaint, ComplaintUpdate
from .serializers import ComplaintSerializer, ComplaintUpdateSerializer


class ComplaintViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComplaintSerializer

    def get_queryset(self):
        return Complaint.objects.filter(submitted_by=self.request.user).prefetch_related('updates')

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


class ComplaintUpdateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComplaintUpdateSerializer

    def get_queryset(self):
        return ComplaintUpdate.objects.filter(complaint__submitted_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)
