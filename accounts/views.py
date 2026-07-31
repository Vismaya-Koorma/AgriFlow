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
