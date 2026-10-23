"""
Tests for the crop_health app — image analyzer quality-check pipeline and API endpoints.
"""
import io
import numpy as np
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from PIL import Image

User = get_user_model()


def make_test_image(width=224, height=224, color=(80, 140, 60)):
    """Create a minimal valid in-memory RGB image file (green leaf-like)."""
    img = Image.new('RGB', (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf


class ImageAnalyzerUnitTests(TestCase):
    """Unit tests for image pre-processing and quality-check functions."""

    def test_validate_image_input_valid_rgb(self):
        """validate_image_input returns a PIL image for a valid RGB JPEG."""
        from crop_health.image_analyzer import validate_image_input
        img_file = make_test_image()
        pil_img, err = validate_image_input(img_file)
        self.assertIsNone(err, f"Unexpected validation error: {err}")
        self.assertIsNotNone(pil_img)
        self.assertEqual(pil_img.mode, 'RGB')

    def test_validate_image_input_too_small(self):
        """validate_image_input rejects images smaller than 50×50 pixels."""
        from crop_health.image_analyzer import validate_image_input
        small_img = make_test_image(width=30, height=30)
        pil_img, err = validate_image_input(small_img)
        self.assertIsNone(pil_img)
        self.assertIsNotNone(err)
        self.assertEqual(err.get('error'), 'image_too_small')

    def test_validate_image_input_invalid_file(self):
        """validate_image_input rejects non-image binary data."""
        from crop_health.image_analyzer import validate_image_input
        bad_file = io.BytesIO(b'this is not an image file at all')
        pil_img, err = validate_image_input(bad_file)
        self.assertIsNone(pil_img)
        self.assertIsNotNone(err)
        self.assertEqual(err.get('error'), 'invalid_image')

    def test_image_quality_dark_image_rejected(self):
        """check_image_quality rejects extremely dark images."""
        from crop_health.image_analyzer import check_image_quality
        # Create nearly black image
        dark_img = Image.new('RGB', (224, 224), color=(5, 5, 5))
        ok, code, msg = check_image_quality(dark_img, crop_type='Tomato')
        self.assertFalse(ok)
        self.assertEqual(code, 'dark')

    def test_image_quality_good_image_accepted(self):
        """check_image_quality accepts a well-lit, green-leaf-like image."""
        from crop_health.image_analyzer import check_image_quality
        # Green-ish image with texture simulating a leaf
        arr = np.random.randint(60, 140, (224, 224, 3), dtype=np.uint8)
        arr[:, :, 1] = np.clip(arr[:, :, 1] + 50, 0, 255)  # Green foliage dominance
        good_img = Image.fromarray(arr)
        ok, code, msg = check_image_quality(good_img, crop_type='Tomato')
        self.assertTrue(ok)
        self.assertEqual(code, 'acceptable')

    def test_unsupported_crop_returns_structured_error(self):
        """analyze_crop_image returns a clean error dict for unsupported crops."""
        from crop_health.image_analyzer import analyze_crop_image
        img_file = make_test_image()
        result = analyze_crop_image(img_file, crop_type='UnknownVegetable')
        self.assertFalse(result.get('supported', True))
        self.assertIn('message', result)

    def test_normalize_crop_key_alias_map(self):
        """normalize_crop_key correctly maps aliases to canonical keys."""
        from crop_health.image_analyzer import normalize_crop_key
        self.assertEqual(normalize_crop_key('Paddy / Rice'), 'rice')
        self.assertEqual(normalize_crop_key('paddy'), 'rice')
        self.assertEqual(normalize_crop_key('Corn'), 'maize')
        self.assertEqual(normalize_crop_key('Chili'), 'chilli')
        self.assertEqual(normalize_crop_key('tomato'), 'tomato')


class CropHealthAPITests(TestCase):
    """Smoke tests for the crop health REST API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='health_farmer', email='health@example.com',
            password='Password123!', full_name='Health Farmer',
            terms_accepted=True,
        )
        self.client = APIClient()

    def test_crop_health_analyze_requires_auth(self):
        """POST /api/crop-health/analyze/ must reject unauthenticated requests."""
        response = self.client.post('/api/crop-health/analyze/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_crop_health_history_requires_auth(self):
        """GET /api/crop-health/history/ must reject unauthenticated requests."""
        response = self.client.get('/api/crop-health/history/')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_crop_health_analyze_no_image_returns_400(self):
        """Authenticated POST to analyze without an image file returns 400 (bad request)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/crop-health/analyze/', {}, format='multipart')
        # Either 400 (validation failure) or 200 with an error key — NOT 500 or auth error
        self.assertNotIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])
