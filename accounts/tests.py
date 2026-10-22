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

import time
import urllib.parse
from unittest.mock import patch, MagicMock
import jwt
from farms.models import Farm, Field


class GoogleAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.init_url = '/api/auth/google/redirect/'
        self.callback_url = '/accounts/google/login/callback/'
        self.exchange_url = '/api/auth/google/exchange/'
        self.dashboard_url = '/api/dashboard/'

        # Existing user with manager role to test role preservation
        self.manager_user = User.objects.create_user(
            username='existing_manager',
            email='manager@example.com',
            password='Password123!',
            full_name='Manager User',
            role=User.Role.MANAGER,
        )

        # Existing farmer user
        self.farmer_user = User.objects.create_user(
            username='existing_farmer',
            email='farmer@example.com',
            password='Password123!',
            full_name='Existing Farmer',
            role=User.Role.FARMER,
        )

    def test_google_init_redirect(self):
        response = self.client.get(self.init_url + '?json=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('accounts.google.com', response.data['url'])

    # 1. Registered Google email → login succeeds and opens the Farmer Dashboard
    @patch('requests.get')
    @patch('requests.post')
    def test_registered_google_email_login_succeeds(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'valid_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'farmer@example.com', 'email_verified': True, 'name': 'Existing Farmer'}
        )

        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        redirect_url = response.url
        self.assertIn('/login?code=', redirect_url)

        code = redirect_url.split('code=')[1]
        exchange_resp = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(exchange_resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', exchange_resp.data)
        self.assertEqual(exchange_resp.data['user']['email'], 'farmer@example.com')
        self.assertEqual(exchange_resp.data['user']['role'], 'farmer')

    # 2. Unregistered Google email → no account is created, no login token/session is issued, and registration flow is shown
    @patch('requests.get')
    @patch('requests.post')
    def test_unregistered_google_email_redirects_to_registration_without_creating_user(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'never_registered@example.com', 'email_verified': True, 'name': 'New User'}
        )

        initial_count = User.objects.count()

        # Browser redirect flow
        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        redirect_url = response.url

        # Must redirect to /register with error_code and email
        self.assertIn('/register', redirect_url)
        self.assertIn('GOOGLE_ACCOUNT_NOT_REGISTERED', redirect_url)
        self.assertIn('never_registered%40example.com', redirect_url)
        self.assertIn('This email is not registered with AgriFlow. Please register first.', urllib.parse.unquote(redirect_url))

        # Crucial check: NO user was created in the database!
        self.assertEqual(User.objects.count(), initial_count)
        self.assertFalse(User.objects.filter(email='never_registered@example.com').exists())

        # JSON API flow
        json_resp = self.client.get(self.callback_url + '?code=valid_google_code&json=true')
        self.assertEqual(json_resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(json_resp.data['error_code'], 'GOOGLE_ACCOUNT_NOT_REGISTERED')
        self.assertEqual(json_resp.data['email'], 'never_registered@example.com')
        self.assertEqual(User.objects.count(), initial_count)

    # 3. Email with different letter casing → correctly matches an existing account
    @patch('requests.get')
    @patch('requests.post')
    def test_google_email_casing_insensitivity(self, mock_post, mock_get):
        # User created with uppercase/lowercase mix
        cased_user = User.objects.create_user(
            username='cased_user',
            email='CasedUser@Example.Com',
            password='Password123!',
            full_name='Cased User',
            role=User.Role.FARMER,
        )

        initial_count = User.objects.count()

        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'caseduser@example.com', 'email_verified': True, 'name': 'Cased User'}
        )

        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/login?code=', response.url)

        code = response.url.split('code=')[1]
        exchange_resp = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(exchange_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(exchange_resp.data['user']['id'], cased_user.id)
        # Verify no duplicate user was created
        self.assertEqual(User.objects.count(), initial_count)

    # 4. Google email that is not verified → rejected
    @patch('requests.get')
    @patch('requests.post')
    def test_unverified_google_email_rejected(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'farmer@example.com', 'email_verified': False, 'name': 'Unverified User'}
        )

        response = self.client.get(self.callback_url + '?code=valid_google_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/login?error=', response.url)
        self.assertIn('not verified', urllib.parse.unquote(response.url))

        # JSON mode
        json_resp = self.client.get(self.callback_url + '?code=valid_google_code&json=true')
        self.assertEqual(json_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(json_resp.data['error_code'], 'GOOGLE_EMAIL_UNVERIFIED')

    # 5. Invalid or expired Google token → rejected
    @patch('requests.post')
    def test_invalid_google_token_rejected(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=400,
            headers={'content-type': 'application/json'},
            json=lambda: {'error_description': 'Invalid grant'}
        )

        response = self.client.get(self.callback_url + '?code=bad_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/login?error=', response.url)

        json_resp = self.client.get(self.callback_url + '?code=bad_code&json=true')
        self.assertEqual(json_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(json_resp.data['error_code'], 'GOOGLE_TOKEN_EXCHANGE_FAILED')

    @patch('requests.get')
    @patch('requests.post')
    def test_expired_google_id_token_rejected(self, mock_post, mock_get):
        expired_token = jwt.encode({'exp': time.time() - 3600, 'iss': 'accounts.google.com', 'email': 'farmer@example.com', 'email_verified': True}, 'a'*32, algorithm='HS256')
        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'valid_access_token', 'id_token': expired_token}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'farmer@example.com', 'email_verified': True}
        )

        response = self.client.get(self.callback_url + '?code=valid_code')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('expired', response.url.lower())

    # 6. Existing user's farms and related data remain unchanged after login
    @patch('requests.get')
    @patch('requests.post')
    def test_existing_user_farms_and_data_unchanged(self, mock_post, mock_get):
        farm = Farm.objects.create(
            user=self.farmer_user,
            name='Kuttanad Organic Farm',
            district='Alappuzha',
            total_area=12.50,
        )

        mock_post.return_value = MagicMock(
            status_code=200,
            headers={'content-type': 'application/json'},
            json=lambda: {'access_token': 'fake_google_access_token'}
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'email': 'farmer@example.com', 'email_verified': True, 'name': 'Existing Farmer'}
        )

        response = self.client.get(self.callback_url + '?code=valid_code')
        code = response.url.split('code=')[1]
        exchange_resp = self.client.post(self.exchange_url, {'code': code}, format='json')
        self.assertEqual(exchange_resp.status_code, status.HTTP_200_OK)

        # Farm still exists, still belongs to farmer_user, total_area is unchanged
        farm.refresh_from_db()
        self.assertEqual(farm.user_id, self.farmer_user.id)
        self.assertEqual(farm.name, 'Kuttanad Organic Farm')
        self.assertEqual(float(farm.total_area), 12.50)
        self.assertEqual(Farm.objects.filter(user=self.farmer_user).count(), 1)

    # 7. Email/password login and registration continue to work
    def test_email_password_login_and_registration_continue_to_work(self):
        new_payload = {
            'full_name': 'Registered via Password',
            'username': 'pass_farmer',
            'email': 'passfarmer@example.com',
            'phone_number': '9988776655',
            'district': 'Kottayam',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'terms_accepted': True,
        }
        reg_resp = self.client.post('/api/auth/register/', new_payload, format='json')
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='pass_farmer').exists())

        login_resp = self.client.post('/api/auth/login/', {
            'username': 'passfarmer@example.com',
            'password': 'SecurePassword123!'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', login_resp.data)

    # 8. Direct access to protected dashboard routes remains blocked for unauthenticated users
    def test_direct_access_to_dashboard_blocked_for_unauthenticated_users(self):
        # Unauthenticated request must be blocked
        unauth_resp = self.client.get(self.dashboard_url)
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated request succeeds
        self.client.force_authenticate(user=self.farmer_user)
        auth_resp = self.client.get(self.dashboard_url)
        self.assertEqual(auth_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(auth_resp.data['user']['email'], self.farmer_user.email)

    # 9. OAuth callback errors are handled gracefully
    def test_oauth_callback_errors_handled_gracefully(self):
        # Error param present
        response = self.client.get(self.callback_url + '?error=access_denied')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/login?error=access_denied', response.url)

        # Missing code
        response_no_code = self.client.get(self.callback_url)
        self.assertEqual(response_no_code.status_code, status.HTTP_302_FOUND)
        self.assertIn('/login?error=', response_no_code.url)

        # Re-exchanging invalid or consumed code
        invalid_resp = self.client.post(self.exchange_url, {'code': 'non_existent_code'}, format='json')
        self.assertEqual(invalid_resp.status_code, status.HTTP_400_BAD_REQUEST)
