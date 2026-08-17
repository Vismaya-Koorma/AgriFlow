import os
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import CropHealthAnalysisLog
from .serializers import CropHealthAnalysisLogSerializer
from .text_analyzer import analyze_text_symptoms, normalize_crop_name
from .image_analyzer import analyze_crop_image, SUPPORTED_CROPS
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
        - field_id (optional)
        """
        crop_type = (request.data.get('crop_type') or request.data.get('crop') or 'General Crop').strip()
        symptoms = (request.data.get('symptoms') or '').strip()
        image_file = request.FILES.get('image') or request.data.get('image')
        field_id = request.data.get('field_id') or request.data.get('field')

        has_text = bool(symptoms)
        has_image = bool(image_file and not isinstance(image_file, str))

        if not has_text and not has_image:
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Please provide text symptoms, upload a leaf image, or both.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Field Integration & Crop Conflict Check
        field_obj = None
        field_warning = None
        if field_id:
            field_obj = Field.objects.filter(id=field_id, farm__user=request.user).first()
            if field_obj and field_obj.crop_type:
                field_crop_str = field_obj.crop_type.name if hasattr(field_obj.crop_type, 'name') else str(field_obj.crop_type)
                reg_crop = normalize_crop_name(field_crop_str)
                req_crop = normalize_crop_name(crop_type)
                if reg_crop.lower() != req_crop.lower() and reg_crop != "General" and req_crop != "General":
                    field_warning = f"The selected crop ({crop_type}) does not match the crop registered for field '{field_obj.name}' ({field_crop_str})."

        text_result = None
        image_result = None

        # 2. Text Analysis using Sentence Transformers & Cosine Similarity
        if has_text:
            text_result = analyze_text_symptoms(symptoms, crop_type=crop_type)

        # 3. Image Analysis using MobileNetV2 CNN Model
        if has_image:
            image_result = analyze_crop_image(image_file, crop_type=crop_type)

        # Handle Image Error (only for corrupted/unreadable image format)
        if image_result and image_result.get("error") == "invalid_image":
            return Response({
                'success': False,
                'error': image_result['error'],
                'message': image_result['message']
            }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Multi-Modal Evidence Fusion & Confidence Calibration
        evidence_status = "SINGLE_MODALITY"
        uncertain = False
        top_margin = 1.0

        if has_text and has_image:
            input_type = 'both'
            img_supported = image_result.get('supported', False) if image_result else False

            if img_supported:
                img_disease = image_result.get('disease_name', '')
                txt_disease = text_result.get('disease_name', '')

                img_conf = image_result.get('confidence', 70.0)
                txt_conf = text_result.get('confidence', 70.0)

                # Disease-level evidence fusion (65% Image + 35% Text)
                confidence = round(0.65 * img_conf + 0.35 * txt_conf, 1)

                # Multimodal evidence alignment status
                img_clean = img_disease.lower().replace("possible ", "").strip()
                txt_clean = txt_disease.lower().replace("possible ", "").strip()

                if img_clean == txt_clean or "healthy" in img_clean and "healthy" in txt_clean:
                    evidence_status = "AGREEMENT"
                    predicted_disease = image_result.get('disease_name', '')
                    status_val = image_result.get('status')
                else:
                    evidence_status = "CONFLICTING"
                    # If conflict, prioritize image model but flag conflict
                    predicted_disease = image_result.get('disease_name', '')
                    status_val = f"Possible {predicted_disease} (Conflicting Symptoms)"

                # Check top margin uncertainty (if margin < 15%)
                disease_probs = image_result.get('disease_probabilities', {})
                if disease_probs and len(disease_probs) >= 2:
                    sorted_probs = sorted(disease_probs.values(), reverse=True)
                    top_margin = sorted_probs[0] - sorted_probs[1]
                    if top_margin < 0.15:
                        uncertain = True
                        evidence_status = "UNCERTAIN"
                        status_val = f"Possible {predicted_disease} (Uncertain Prediction)"
            else:
                status_val = text_result.get('status')
                predicted_disease = text_result.get('disease_name', '')
                confidence = text_result.get('confidence', 75.0)

            possible_causes = list(dict.fromkeys(
                (image_result.get('possible_causes', []) if (image_result and img_supported) else []) +
                (text_result.get('possible_causes', []) if text_result else [])
            ))
            fertilizer = list(dict.fromkeys(
                (image_result.get('fertilizer', []) if (image_result and img_supported) else []) +
                (text_result.get('fertilizer', []) if text_result else [])
            ))
            watering_advice = (image_result.get('watering_advice') if (image_result and img_supported) else None) or text_result.get('watering_advice', '')
            prevention = list(dict.fromkeys(
                (image_result.get('prevention', []) if (image_result and img_supported) else []) +
                (text_result.get('prevention', []) if text_result else [])
            ))

        elif has_image:
            input_type = 'image'
            img_supported = image_result.get('supported', False)
            status_val = image_result.get('status', 'Healthy')
            predicted_disease = image_result.get('disease_name', '')
            possible_causes = image_result.get('possible_causes', [])
            fertilizer = image_result.get('fertilizer', [])
            watering_advice = image_result.get('watering_advice', '')
            prevention = image_result.get('prevention', [])
            confidence = image_result.get('confidence', 0.0 if not img_supported else 85.0)

            disease_probs = image_result.get('disease_probabilities', {})
            if disease_probs and len(disease_probs) >= 2:
                sorted_probs = sorted(disease_probs.values(), reverse=True)
                top_margin = sorted_probs[0] - sorted_probs[1]
                if top_margin < 0.15:
                    uncertain = True
                    evidence_status = "UNCERTAIN"

        else:  # Text only
            input_type = 'text'
            status_val = text_result.get('status', 'Healthy')
            predicted_disease = text_result.get('disease_name', '')
            possible_causes = text_result.get('possible_causes', [])
            fertilizer = text_result.get('fertilizer', [])
            watering_advice = text_result.get('watering_advice', '')
            prevention = text_result.get('prevention', [])
            confidence = text_result.get('confidence', 85.0)

        # 5. Classify Evidence Status (STRONG, MODERATE, CONFLICTING, INSUFFICIENT)
        control_measures = []
        nutrient_management = []

        if evidence_status == "CONFLICTING":
            control_measures = [
                "Image and symptom analysis indicate different possible diseases. Upload a clearer close-up image and provide additional symptoms.",
                "Avoid applying chemical fungicides or pesticides until diagnosis is confirmed."
            ]
            nutrient_management = ["Maintain standard crop irrigation and field sanitation."]
        elif uncertain or confidence < 60.0:
            evidence_status = "INSUFFICIENT"
            control_measures = [
                "Diagnosis confidence is insufficient due to blurry image or ambiguous symptoms.",
                "Please upload a well-lit, sharp close-up photo of the affected plant leaf."
            ]
            nutrient_management = ["Maintain standard crop irrigation and field sanitation."]
        elif evidence_status == "AGREEMENT" or confidence >= 80.0:
            evidence_status = "STRONG"
        else:
            evidence_status = "MODERATE"

        # 6. Save to Database
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

        # Extract control measures & nutrient management if not conflicting/insufficient
        if evidence_status not in ["CONFLICTING", "INSUFFICIENT"]:
            if image_result and image_result.get('control_measures'):
                control_measures = image_result.get('control_measures')
            elif text_result and text_result.get('treatment'):
                control_measures = text_result.get('treatment')
            else:
                control_measures = ["Consult agricultural extension officer for disease treatment."]

            if image_result and image_result.get('nutrient_management'):
                nutrient_management = image_result.get('nutrient_management')
            elif text_result and text_result.get('fertilizer'):
                nutrient_management = text_result.get('fertilizer')
            else:
                nutrient_management = []

        # Determine symptoms list for response payload
        if has_text:
            symptoms_list = [symptoms]
        elif image_result and image_result.get('symptoms'):
            symptoms_list = image_result.get('symptoms')
        else:
            symptoms_list = ["Visual leaf inspection"]

        image_quality = image_result.get('image_quality', 'acceptable') if image_result else 'n/a'
        requires_clearer_image = (evidence_status in ["CONFLICTING", "INSUFFICIENT"]) or (image_result.get('requires_clearer_image', False) if image_result else False)

        return Response({
            'success': True,
            'id': log.id,
            'crop': log.crop_type,
            'crop_type': log.crop_type,
            'disease': log.predicted_disease,
            'disease_name': log.predicted_disease,
            'predicted_disease': log.predicted_disease,
            'status': log.status,
            'evidence_status': evidence_status,
            'uncertain': uncertain,
            'image_quality': image_quality,
            'requires_clearer_image': requires_clearer_image,
            'input_type': log.input_type,
            'model': 'MobileNetV2',
            'symptoms': symptoms_list,
            'possible_causes': log.possible_causes,
            'control_measures': control_measures,
            'treatment': control_measures,
            'fertilizer': nutrient_management,
            'nutrient_management': nutrient_management,
            'watering_advice': log.watering_advice,
            'prevention': log.prevention,
            'image': log.image.url if log.image else None,
            'field_id': log.field_id,
            'field_name': log.field.name if log.field else None,
            'field_warning': field_warning,
            'created_at': log.created_at,
            'text_analysis': text_result,
            'image_analysis': image_result
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """GET /api/crop-health/history/"""
        qs = self.get_queryset()[:100]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
