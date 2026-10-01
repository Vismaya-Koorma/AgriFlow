"""
Django settings for agriflow_backend project — Production Ready.
"""

from pathlib import Path
from datetime import timedelta
import os
import dj_database_url

# Load .env manually for Python 3.14 compatibility
_env_path = Path(__file__).resolve().parent.parent / '.env'
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _key, _, _val = _line.partition('=')
                os.environ.setdefault(_key.strip(), _val.strip())

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-agriflow-dev-only-secret-key-change-in-production'
    else:
        raise ValueError("SECRET_KEY environment variable must be set in production mode!")

_allowed_hosts = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts if h.strip()]

RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local apps
    'accounts',
    'master',
    'farms',
    'weather',
    'irrigation',
    'recommendation',
    'ai_recommendation',
    'crop_health',
    'alerts',
    'maintenance',
    'reports',
    'decision_intelligence',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'agriflow_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'agriflow_backend.wsgi.application'

# Database - PostgreSQL / Render
_default_db_url = f"postgresql://{os.environ.get('DB_USER', 'postgres')}:{os.environ.get('DB_PASSWORD', '')}@{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '5432')}/{os.environ.get('DB_NAME', 'agriflow')}"

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', _default_db_url),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Django REST Framework ───────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# ─── JWT Settings ────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── CORS ────────────────────────────────────────────────────────────────────
_cors_origins = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://agriflow-frontend-q8jd.onrender.com'
)
CORS_ALLOWED_ORIGINS = [o.strip().rstrip('/') for o in _cors_origins.split(',') if o.strip()]
if 'https://agriflow-frontend-q8jd.onrender.com' not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append('https://agriflow-frontend-q8jd.onrender.com')

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-csrftoken',
    'x-requested-with',
]

# ─── CSRF ────────────────────────────────────────────────────────────────────
_csrf_origins = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [o.strip().rstrip('/') for o in _csrf_origins.split(',') if o.strip()]
if 'https://agriflow-frontend-q8jd.onrender.com' not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append('https://agriflow-frontend-q8jd.onrender.com')
if RENDER_EXTERNAL_HOSTNAME:
    _render_csrf = f"https://{RENDER_EXTERNAL_HOSTNAME}"
    if _render_csrf not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_render_csrf)


