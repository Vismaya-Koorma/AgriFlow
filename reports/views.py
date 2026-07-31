from rest_framework import viewsets, permissions
from .models import Report
from .serializers import ReportSerializer


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(generated_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)
