import os
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import CropHealthAnalysisLog
from .serializers import CropHealthAnalysisLogSerializer
from .text_analyzer import analyze_text_symptoms
from .image_analyzer import analyze_crop_image
from farms.models import Field

logger = logging.getLogger(__name__)


class CropHealthViewSet(viewsets.ModelViewSet):
    """AI Crop Health Assistant REST endpoints powered by Sentence Transformers & MobileNetV2."""
    serializer_class = CropHealthAnalysisLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CropHealthAnalysisLog.objects.filter(user=user)

        crop = self.request.query_params.get('crop_type') or self.request.query_params.get('crop')
        search = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if crop:
            qs = qs.filter(crop_type__icontains=crop)

        if search:
            qs = qs.filter(
                Q(symptoms__icontains=search) |
                Q(crop_type__icontains=search) |
                Q(status__icontains=search) |
                Q(predicted_disease__icontains=search)
            )

        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request):
        """
        POST /api/crop-health/analyze/
        Supports form-data / JSON:
        - crop_type
        - symptoms (optional if image present)
        - image (file, optional if symptoms present)
        - field_id
        """
        crop_type = (request.data.get('crop_type') or request.data.get('crop') or 'General Crop').strip()
        symptoms = (request.data.get('symptoms') or '').strip()
        image_file = request.FILES.get('image') or request.data.get('image')
        field_id = request.data.get('field_id') or request.data.get('field')

        has_text = bool(symptoms)
        has_image = bool(image_file and not isinstance(image_file, str))

        if not has_text and not has_image:
            return Response({
                'error': 'validation_error',
                'message': 'Please provide text symptoms, upload a leaf image, or both.'
            }, status=status.HTTP_400_BAD_REQUEST)

        field_obj = None
        if field_id:
            field_obj = Field.objects.filter(id=field_id, farm__user=request.user).first()

        text_result = None
        image_result = None

        # 1. Text Analysis using Sentence Transformers & Cosine Similarity
        if has_text:
            text_result = analyze_text_symptoms(symptoms, crop_type=crop_type)

        # 2. Image Analysis using MobileNetV2 CNN Model
        if has_image:
            image_result = analyze_crop_image(image_file, crop_type=crop_type)

        # 3. Combine Results & Determine Input Type
        if has_text and has_image:
            input_type = 'both'
            # Image takes priority for disease classification if high confidence, blended with text
            status_val = image_result.get('status') if image_result and 'status' in image_result else text_result.get('status')
            predicted_disease = image_result.get('disease_name', '') if image_result else ''
            
            possible_causes = list(dict.fromkeys(
                (image_result.get('possible_causes', []) if image_result else []) +
                (text_result.get('possible_causes', []) if text_result else [])
            ))
            fertilizer = list(dict.fromkeys(
                (image_result.get('fertilizer', []) if image_result else []) +
                (text_result.get('fertilizer', []) if text_result else [])
            ))
            watering_advice = image_result.get('watering_advice') or text_result.get('watering_advice', '')
            prevention = list(dict.fromkeys(
                (image_result.get('prevention', []) if image_result else []) +
                (text_result.get('prevention', []) if text_result else [])
            ))
            # Average real ML confidence
            img_conf = image_result.get('confidence', 90.0) if image_result else 90.0
            txt_conf = text_result.get('confidence', 90.0) if text_result else 90.0
            confidence = round((img_conf + txt_conf) / 2.0, 1)

        elif has_image:
            input_type = 'image'
            status_val = image_result.get('status', 'Healthy')
            predicted_disease = image_result.get('disease_name', '')
            possible_causes = image_result.get('possible_causes', [])
            fertilizer = image_result.get('fertilizer', [])
            watering_advice = image_result.get('watering_advice', '')
            prevention = image_result.get('prevention', [])
            confidence = image_result.get('confidence', 90.0)

        else:  # Text only
            input_type = 'text'
            status_val = text_result.get('status', 'Healthy')
            predicted_disease = ''
            possible_causes = text_result.get('possible_causes', [])
            fertilizer = text_result.get('fertilizer', [])
            watering_advice = text_result.get('watering_advice', '')
            prevention = text_result.get('prevention', [])
            confidence = text_result.get('confidence', 90.0)

        # 4. Save to Database
        log = CropHealthAnalysisLog.objects.create(
            user=request.user,
            field=field_obj,
            crop_type=crop_type,
            input_type=input_type,
            symptoms=symptoms,
            image=image_file if has_image else None,
            status=status_val,
            predicted_disease=predicted_disease,
            possible_causes=possible_causes,
            fertilizer=fertilizer,
            watering_advice=watering_advice,
            prevention=prevention,
            confidence=confidence
        )

        return Response({
            'id': log.id,
            'input_type': log.input_type,
            'status': log.status,
            'crop_type': log.crop_type,
            'symptoms': log.symptoms,
            'image': log.image.url if log.image else None,
            'predicted_disease': log.predicted_disease,
            'field_id': log.field_id,
            'field_name': log.field.name if log.field else None,
            'possible_causes': log.possible_causes,
            'fertilizer': log.fertilizer,
            'watering_advice': log.watering_advice,
            'prevention': log.prevention,
            'confidence': log.confidence,
            'text_analysis': text_result,
            'image_analysis': image_result,
            'created_at': log.created_at
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """GET /api/crop-health/history/"""
        qs = self.get_queryset()[:100]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
