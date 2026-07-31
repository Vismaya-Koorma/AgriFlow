from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.utils import OperationalError


@api_view(['GET'])
@permission_classes([AllowAny])
def root_view(request):
    """Root endpoint — Returns basic project metadata instead of 404."""
    return Response({
        "project": "AgriFlow Backend",
        "status": "Running",
        "version": "1.0"
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_view(request):
    """Health check endpoint — Verifies backend & DB status."""
    db_status = "connected"
    try:
        connection.ensure_connection()
    except (OperationalError, Exception):
        db_status = "disconnected"

    return Response({
        "status": "success" if db_status == "connected" else "degraded",
        "database": db_status,
        "backend": "running"
    }, status=status.HTTP_200_OK)
