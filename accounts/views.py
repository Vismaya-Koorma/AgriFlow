from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer, ChangePasswordSerializer
from .models import LoginLog
from farms.models import Farm, Field
from irrigation.models import IrrigationHistory
from alerts.models import Alert
from farms.serializers import FarmSerializer, FieldSerializer
from irrigation.serializers import IrrigationHistorySerializer
from alerts.serializers import AlertSerializer

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Account created successfully!',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Update last_login in tbl_user
            update_last_login(None, user)

            # Log the login attempt
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
            LoginLog.objects.create(user=user, ip_address=ip, user_agent=request.META.get('HTTP_USER_AGENT', ''))

            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Login successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except TokenError:
            return Response({'message': 'Token already invalid or expired.'})


class TokenRefreshAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            return Response({'access': str(token.access_token)})
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'old_password': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Aggregate data scoped to the logged-in user
        farms = Farm.objects.filter(user=user)
        farm_ids = farms.values_list('id', flat=True)
        fields = Field.objects.filter(farm__in=farm_ids)
        field_ids = fields.values_list('id', flat=True)

        recent_irrigation = IrrigationHistory.objects.filter(
            field__in=field_ids
        ).select_related('field').order_by('-irrigated_at')[:5]

        recent_alerts = Alert.objects.filter(
            field__in=field_ids
        ).filter(is_resolved=False).order_by('-created_at')[:5]

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
            },
            'stats': {
                'total_farms': farms.count(),
                'total_fields': fields.count(),
                'active_alerts': recent_alerts.count(),
            },
            'recent_irrigation': IrrigationHistorySerializer(recent_irrigation, many=True).data,
            'recent_alerts': AlertSerializer(recent_alerts, many=True).data,
        })


# ─── GOOGLE OAUTH 2.0 AUTHENTICATION VIEWS ────────────────────────────────────

import secrets
import time
import urllib.parse
import requests
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import redirect

GOOGLE_TEMP_CODES = {}


class GoogleInitView(APIView):
    """Initiates Google OAuth authorization redirect."""
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        redirect_uri = getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/accounts/google/login/callback/')

        params = {
            'response_type': 'code',
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': 'openid email profile',
            'access_type': 'online',
            'prompt': 'select_account',
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

        if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
            return Response({'url': auth_url})

        return redirect(auth_url)


class GoogleOAuthCallbackView(APIView):
    """
    Handles callback from Google OAuth redirect:
    http://127.0.0.1:8000/accounts/google/login/callback/
    Exchanges authorization code for Google user profile, checks if user is registered,
    generates a single-use short-lived exchange code for registered users,
    and redirects unregistered users to registration page.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        frontend_login = f"{frontend_url}/login"
        frontend_register = f"{frontend_url}/register"

        code = request.GET.get('code')
        error = request.GET.get('error')

        if error or not code:
            err_msg = error or 'Google login was cancelled or failed.'
            if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                return Response({'error': err_msg, 'error_code': 'OAUTH_CALLBACK_ERROR'}, status=status.HTTP_400_BAD_REQUEST)
            return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

        # Exchange authorization code with Google
        token_url = 'https://oauth2.googleapis.com/token'
        payload = {
            'code': code,
            'client_id': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'GOOGLE_CLIENT_SECRET', ''),
            'redirect_uri': getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/accounts/google/login/callback/'),
            'grant_type': 'authorization_code',
        }

        try:
            token_resp = requests.post(token_url, data=payload, timeout=10)
            if token_resp.status_code != 200:
                err_data = token_resp.json() if token_resp.headers.get('content-type', '').startswith('application/json') else {}
                err_msg = err_data.get('error_description') or 'Failed to exchange authorization code with Google.'
                if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                    return Response({'error': err_msg, 'error_code': 'GOOGLE_TOKEN_EXCHANGE_FAILED'}, status=status.HTTP_400_BAD_REQUEST)
                return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

            token_data = token_resp.json()
            access_token = token_data.get('access_token')

            # Fetch user info from Google
            userinfo_resp = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            if userinfo_resp.status_code != 200:
                err_msg = 'Failed to fetch user profile from Google.'
                if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                    return Response({'error': err_msg, 'error_code': 'GOOGLE_USERINFO_FAILED'}, status=status.HTTP_400_BAD_REQUEST)
                return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

            userinfo = userinfo_resp.json()
            email = userinfo.get('email', '').strip().lower()
            email_verified = userinfo.get('email_verified', False)

            # Validate ID Token claims if present
            id_token = token_data.get('id_token')
            if id_token:
                try:
                    import jwt
                    claims = jwt.decode(id_token, options={"verify_signature": False})
                    exp = claims.get('exp')
                    if exp and exp < time.time():
                        err_msg = 'Google token has expired.'
                        if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                            return Response({'error': err_msg, 'error_code': 'GOOGLE_TOKEN_EXPIRED'}, status=status.HTTP_400_BAD_REQUEST)
                        return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

                    iss = claims.get('iss')
                    if iss and iss not in ('accounts.google.com', 'https://accounts.google.com'):
                        err_msg = 'Invalid token issuer.'
                        if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                            return Response({'error': err_msg, 'error_code': 'INVALID_TOKEN_ISSUER'}, status=status.HTTP_400_BAD_REQUEST)
                        return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

                    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
                    aud = claims.get('aud')
                    if client_id and aud and aud != client_id:
                        err_msg = 'Invalid token audience.'
                        if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                            return Response({'error': err_msg, 'error_code': 'INVALID_TOKEN_AUDIENCE'}, status=status.HTTP_400_BAD_REQUEST)
                        return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

                    if 'email_verified' in claims and not claims.get('email_verified'):
                        email_verified = False

                    if not email and claims.get('email'):
                        email = claims.get('email', '').strip().lower()
                except Exception:
                    pass

            if not email or not email_verified:
                err_msg = 'Google account email is not verified or missing.'
                if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                    return Response({'error': err_msg, 'error_code': 'GOOGLE_EMAIL_UNVERIFIED'}, status=status.HTTP_400_BAD_REQUEST)
                return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

            # Normalize email
            normalized_email = User.objects.normalize_email(email).strip().lower()

            # Find existing user by verified normalized email
            user = User.objects.filter(email__iexact=normalized_email).first()
            if not user:
                err_msg = 'This email is not registered with AgriFlow. Please register first.'
                if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                    return Response({
                        'error': err_msg,
                        'error_code': 'GOOGLE_ACCOUNT_NOT_REGISTERED',
                        'email': normalized_email,
                    }, status=status.HTTP_404_NOT_FOUND)

                redirect_url = (
                    f"{frontend_register}?"
                    f"error={urllib.parse.quote(err_msg)}"
                    f"&error_code=GOOGLE_ACCOUNT_NOT_REGISTERED"
                    f"&email={urllib.parse.quote(normalized_email)}"
                )
                return redirect(redirect_url)

            if not user.is_active:
                err_msg = 'Your account is inactive. Please contact support.'
                if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                    return Response({'error': err_msg, 'error_code': 'ACCOUNT_INACTIVE'}, status=status.HTTP_400_BAD_REQUEST)
                return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")

            # Create single-use short-lived exchange token (5 minutes) for verified registered user
            temp_code = secrets.token_urlsafe(32)
            cache.set(f"google_auth_code_{temp_code}", user.id, timeout=300)
            GOOGLE_TEMP_CODES[temp_code] = {'user_id': user.id, 'expires_at': time.time() + 300}

            # Redirect to React frontend login page WITH exchange code ONLY (zero JWTs in URL)
            return redirect(f"{frontend_login}?code={temp_code}")

        except Exception as e:
            err_msg = 'An error occurred during Google authentication.'
            if request.query_params.get('json') == 'true' or 'application/json' in request.headers.get('Accept', ''):
                return Response({'error': err_msg, 'error_code': 'GOOGLE_AUTH_ERROR'}, status=status.HTTP_400_BAD_REQUEST)
            return redirect(f"{frontend_login}?error={urllib.parse.quote(err_msg)}")


class GoogleTokenExchangeView(APIView):
    """
    Exchanges short-lived single-use code for standard AgriFlow SimpleJWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        temp_code = request.data.get('code')
        if not temp_code:
            return Response({'error': 'Exchange code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve user ID from cache or memory fallback
        user_id = cache.get(f"google_auth_code_{temp_code}")
        if not user_id and temp_code in GOOGLE_TEMP_CODES:
            entry = GOOGLE_TEMP_CODES.get(temp_code)
            if entry and entry['expires_at'] > time.time():
                user_id = entry['user_id']

        # SINGLE-USE SECURITY ENFORCEMENT: Immediately invalidate code
        cache.delete(f"google_auth_code_{temp_code}")
        GOOGLE_TEMP_CODES.pop(temp_code, None)

        if not user_id:
            return Response({'error': 'Invalid or expired exchange code.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'This email is not registered with AgriFlow. Please register first.',
                'error_code': 'GOOGLE_ACCOUNT_NOT_REGISTERED'
            }, status=status.HTTP_404_NOT_FOUND)

        if not user.is_active:
            return Response({'error': 'Your account is inactive. Please contact support.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update last_login and log the attempt
        update_last_login(None, user)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        LoginLog.objects.create(user=user, ip_address=ip, user_agent=request.META.get('HTTP_USER_AGENT', ''))

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Google authentication successful.',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })

