from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CropType, SoilType, CropVariety, CropWaterRequirement
from .serializers import (
    CropTypeSerializer, SoilTypeSerializer,
    CropVarietySerializer, CropWaterRequirementSerializer
)


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


class CropVarietyViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve crop varieties, filterable by crop ID."""
    queryset = CropVariety.objects.filter(status=True)
    serializer_class = CropVarietySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        crop_id = (
            self.request.query_params.get('crop') or 
            self.request.query_params.get('crop_id') or 
            self.request.query_params.get('crop_type')
        )
        if crop_id:
            qs = qs.filter(crop_id=crop_id)
        return qs



class CropWaterRequirementViewSet(viewsets.ReadOnlyModelViewSet):
    """List, retrieve, and lookup agricultural water requirements."""
    queryset = CropWaterRequirement.objects.all()
    serializer_class = CropWaterRequirementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        crop_id = self.request.query_params.get('crop') or self.request.query_params.get('crop_id')
        variety_id = self.request.query_params.get('variety') or self.request.query_params.get('variety_id')
        crop_stage = self.request.query_params.get('crop_stage')
        soil_type_id = self.request.query_params.get('soil_type') or self.request.query_params.get('soil_type_id')

        if crop_id:
            qs = qs.filter(crop_id=crop_id)
        if variety_id:
            qs = qs.filter(variety_id=variety_id)
        if crop_stage:
            qs = qs.filter(crop_stage=crop_stage)
        if soil_type_id:
            qs = qs.filter(soil_type_id=soil_type_id)
        return qs

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Lookup water requirement using strict-to-broad fallback hierarchy."""
        crop_id = request.query_params.get('crop') or request.query_params.get('crop_id')
        variety_id = request.query_params.get('variety') or request.query_params.get('variety_id')
        crop_stage = request.query_params.get('crop_stage')
        soil_type_id = request.query_params.get('soil_type') or request.query_params.get('soil_type_id')

        if not crop_id:
            return Response({'error': 'crop parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Level 1: Exact Match (crop + variety + crop_stage + soil_type)
        if variety_id and crop_stage and soil_type_id:
            match = CropWaterRequirement.objects.filter(
                crop_id=crop_id, variety_id=variety_id, crop_stage=crop_stage, soil_type_id=soil_type_id
            ).first()
            if match:
                data = self.get_serializer(match).data
                data['source_level'] = 'exact_variety_soil'
                return Response(data)

        # Level 2: Variety Match (crop + variety + crop_stage)
        if variety_id and crop_stage:
            match = CropWaterRequirement.objects.filter(
                crop_id=crop_id, variety_id=variety_id, crop_stage=crop_stage
            ).first()
            if match:
                data = self.get_serializer(match).data
                data['source_level'] = 'exact_variety'
                return Response(data)

        # Level 3: Variety Default (crop + variety)
        if variety_id:
            match = CropWaterRequirement.objects.filter(
                crop_id=crop_id, variety_id=variety_id
            ).first()
            if match:
                data = self.get_serializer(match).data
                data['source_level'] = 'variety_general'
                return Response(data)

        # Level 4: Stage & Soil Match (crop + crop_stage + soil_type)
        if crop_stage and soil_type_id:
            match = CropWaterRequirement.objects.filter(
                crop_id=crop_id, crop_stage=crop_stage, soil_type_id=soil_type_id
            ).first()
            if match:
                data = self.get_serializer(match).data
                data['source_level'] = 'crop_stage_soil'
                return Response(data)

        # Level 5: Crop Stage Match (crop + crop_stage)
        if crop_stage:
            match = CropWaterRequirement.objects.filter(
                crop_id=crop_id, crop_stage=crop_stage
            ).first()
            if match:
                data = self.get_serializer(match).data
                data['source_level'] = 'crop_stage'
                return Response(data)

        # Level 6: Any match for crop
        match = CropWaterRequirement.objects.filter(crop_id=crop_id).first()
        if match:
            data = self.get_serializer(match).data
            data['source_level'] = 'crop_general'
            return Response(data)

        return Response({'message': 'No specific database water requirement found for this selection.', 'source_level': 'default_fallback'}, status=status.HTTP_404_NOT_FOUND)

