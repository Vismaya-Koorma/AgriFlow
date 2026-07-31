from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'full_name', 'phone_number',
            'district', 'state', 'role', 'password', 'confirm_password',
            'terms_accepted',
        ]

    def validate_username(self, value):
        username = value.strip().lower()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return email

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        if not data.get('terms_accepted', False):
            raise serializers.ValidationError({'terms_accepted': 'You must accept the terms and conditions.'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        identifier = data.get('username', '').strip().lower()
        password = data.get('password', '')

        if not identifier or not password:
            raise serializers.ValidationError('Please provide both username/email and password.')

        # Support login by email OR username (case-insensitive)
        user = (
            User.objects.filter(email__iexact=identifier).first()
            or User.objects.filter(username__iexact=identifier).first()
        )

        if user and user.check_password(password):
            if not user.is_active:
                raise serializers.ValidationError('Your account is inactive. Please contact support.')
            data['user'] = user
            return data

        raise serializers.ValidationError('Invalid username/email or password. Please check your credentials.')


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone_number',
            'district', 'state', 'role', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'username', 'role', 'is_active', 'created_at', 'updated_at']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data
