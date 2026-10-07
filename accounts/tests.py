from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'

        # Existing user for testing duplicates
        self.existing_user = User.objects.create_user(
            username='existing_user',
            email='existing@example.com',
            password='Password123!',
            full_name='Existing User',
            phone_number='9876543210',
            district='Ernakulam',
            terms_accepted=True,
        )

        self.valid_payload = {
            'full_name': 'New Farmer',
            'username': 'new_farmer',
            'email': 'newfarmer@example.com',
            'phone_number': '9123456789',
            'district': 'Thiruvananthapuram',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'terms_accepted': True,
        }

    # ─── REGISTRATION TESTS ───────────────────────────────────────────────────

    def test_registration_valid(self):
        response = self.client.post(self.register_url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertTrue(User.objects.filter(username='new_farmer').exists())

    def test_registration_missing_required_fields(self):
        payload = {
            'full_name': '',
            'username': '',
            'email': '',
            'phone_number': '',
            'district': '',
            'password': '',
            'confirm_password': '',
            'terms_accepted': False,
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('phone_number', response.data)
        self.assertIn('password', response.data)

    def test_registration_invalid_email_formats(self):
        invalid_emails = ['user@', 'user.com', '@gmail.com', 'user@gmail', 'user gmail.com']
        for email in invalid_emails:
            payload = self.valid_payload.copy()
            payload['email'] = email
            response = self.client.post(self.register_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, f"Failed for email: {email}")
            self.assertIn('email', response.data)
            self.assertIn("Please enter a valid email address.", response.data['email'])

    def test_registration_invalid_mobile_numbers(self):
        invalid_mobiles = ['1234567890', '987654321', '98765432101', '98765abc10']
        for mobile in invalid_mobiles:
            payload = self.valid_payload.copy()
            payload['phone_number'] = mobile
            response = self.client.post(self.register_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, f"Failed for mobile: {mobile}")
            self.assertIn('phone_number', response.data)
            self.assertIn("Please enter a valid 10-digit mobile number.", response.data['phone_number'])

    def test_registration_short_password(self):
        payload = self.valid_payload.copy()
        payload['password'] = 'short'
        payload['confirm_password'] = 'short'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_password_missing_uppercase(self):
        payload = self.valid_payload.copy()
        payload['password'] = 'securepassword123!'
        payload['confirm_password'] = 'securepassword123!'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_password_missing_special_char(self):
        payload = self.valid_payload.copy()
        payload['password'] = 'SecurePassword123'
        payload['confirm_password'] = 'SecurePassword123'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_registration_password_mismatch(self):
        payload = self.valid_payload.copy()
        payload['password'] = 'SecurePassword123!'
        payload['confirm_password'] = 'DifferentPassword123!'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', response.data)
        self.assertIn("Passwords do not match.", response.data['confirm_password'])

    def test_registration_existing_email(self):
        payload = self.valid_payload.copy()
        payload['email'] = 'existing@example.com'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn("Email address is already registered.", response.data['email'])

    def test_registration_existing_mobile(self):
        payload = self.valid_payload.copy()
        payload['phone_number'] = '9876543210'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)
        self.assertIn("An account with this mobile number already exists.", response.data['phone_number'])

    # ─── LOGIN TESTS ──────────────────────────────────────────────────────────

    def test_login_valid_username(self):
        payload = {'username': 'existing_user', 'password': 'Password123!'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_valid_email(self):
        payload = {'username': 'existing@example.com', 'password': 'Password123!'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_invalid_email_format(self):
        invalid_emails = ['user@', 'user.com', '@gmail.com', 'user@gmail']
        for email in invalid_emails:
            payload = {'username': email, 'password': 'Password123!'}
            response = self.client.post(self.login_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('username', response.data)

    def test_login_empty_fields(self):
        payload = {'username': '', 'password': ''}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_wrong_password(self):
        payload = {'username': 'existing_user', 'password': 'WrongPassword'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertIn("Invalid email or password.", response.data['non_field_errors'])

    def test_login_non_existing_user(self):
        payload = {'username': 'nonexistent@example.com', 'password': 'Password123!'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertIn("Invalid email or password.", response.data['non_field_errors'])


# ─── GOOGLE OAUTH 2.0 TESTS ───────────────────────────────────────────────────

from unittest.mock import patch, MagicMock


class GoogleAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.init_url = '/api/auth/google/redirect/'
        self.callback_url = '/accounts/google/login/callback/'
        self.exchange_url = '/api/auth/google/exchange/'

        # Existing user with manager role to test role preservation
        self.manager_user = User.objects.create_user(
            username='existing_manager',
            email='manager@example.com',
            password='Password123!',
            full_name='Manager User',
            role=User.Role.MANAGER,
        )

    def test_google_init_redirect(self):
        response = self.client.get(self.init_url + '?json=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('accounts.google.com', response.data['url'])

    @patch('requests.get')
    @patch('requests.post')
    def test_google_callback_existing_user_preserves_role(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'manager@example.com', 'email_verified': True, 'name': 'Manager User'}
        )

        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        redirect_url = response.url
        self.assertIn('code=', redirect_url)
        self.assertNotIn('access=', redirect_url)

        code = redirect_url.split('code=')[1]
        exchange_resp = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(exchange_resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', exchange_resp.data)
        self.assertEqual(exchange_resp.data['user']['role'], 'manager')

    @patch('requests.get')
    @patch('requests.post')
    def test_google_callback_new_user_gets_farmer_role(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'new_google_user@example.com', 'email_verified': True, 'name': 'New Google User'}
        )

        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        code = response.url.split('code=')[1]

        exchange_resp = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(exchange_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(exchange_resp.data['user']['role'], 'farmer')

        # Single-use security check: Re-exchanging same code MUST fail
        second_exchange = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(second_exchange.status_code, status.HTTP_400_BAD_REQUEST)

    def test_exchange_invalid_code(self):
        response = self.client.post(self.exchange_url, {'code': 'invalid_code'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

