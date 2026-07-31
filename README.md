# AgriFlow AI — Django Backend & React Integration

A production-ready Django REST Framework backend connected to an existing React + Vite frontend for AgriFlow AI, an intelligent agricultural management platform.

---

## 🛠 Tech Stack

- **Frontend**: React + Vite + Material UI + Recharts + Axios
- **Backend**: Django 4.2 + Django REST Framework (DRF)
- **Database**: PostgreSQL (`agriflow`)
- **Authentication**: JWT (JSON Web Tokens via `djangorestframework-simplejwt`)
- **CORS**: `django-cors-headers`

---

## 📁 Project Structure

```
AgriFlow/
├── manage.py                   # Django management script
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (DB, Secret Key, CORS)
├── .env.example                # Template for environment configuration
├── agriflow_backend/           # Main project settings & URLs
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── accounts/                   # Auth & User management (tbl_user, tbl_login)
├── master/                     # Master tables (tbl_crop_type, tbl_soil_type)
├── farms/                      # Farm & Field management (tbl_farm, tbl_field)
├── weather/                    # Weather telemetry (tbl_weather_data)
├── irrigation/                 # Irrigation history (tbl_irrigation_history, tbl_rainfall_confirmation)
├── recommendation/             # AI tables (soil moisture, recommendation, stress risk, priority)
├── alerts/                     # Notifications (tbl_alert)
├── maintenance/                # Maintenance (tbl_complaint, tbl_complaint_update)
├── reports/                    # Reports (tbl_report)
└── AgriFlow/                   # React (Vite) Frontend
    ├── src/
    │   ├── services/
    │   │   └── api.js          # Axios client with JWT refresh interceptors
    │   ├── context/
    │   │   └── AuthContext.jsx # Real Django JWT authentication provider
    │   └── ...
```

---

## 🔐 Database & Configuration

1. Create PostgreSQL database:
```sql
CREATE DATABASE agriflow;
```

2. Update `.env` with your PostgreSQL credentials:
```env
SECRET_KEY=django-insecure-agriflow-super-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=agriflow
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🚀 Running the Backend

### 1. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 2. Create Superuser (Django Admin)
```bash
python manage.py createsuperuser
```

### 3. Start Development Server
```bash
python manage.py runserver 8000
```

Access Django Admin at `http://localhost:8000/admin/`.

---

## 💻 Running the React Frontend

```bash
cd AgriFlow
npm install
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## 📡 API Documentation

### Authentication APIs (`/api/auth/`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register/` | Register new user | No |
| `POST` | `/api/auth/login/` | Obtain JWT access & refresh tokens | No |
| `POST` | `/api/auth/logout/` | Blacklist refresh token | Yes |
| `POST` | `/api/auth/refresh/` | Refresh access token | No |
| `GET`  | `/api/auth/profile/` | Fetch user profile | Yes |
| `PUT`  | `/api/auth/profile/` | Update profile info | Yes |
| `POST` | `/api/auth/change-password/` | Change account password | Yes |

### Core & Dashboard APIs (`/api/`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/dashboard/` | Dashboard metrics (User, Farms count, Fields count, Recent alerts, History) | Yes |
| `GET/POST` | `/api/farms/` | List or create farms | Yes |
| `PUT/DELETE` | `/api/farms/{id}/` | Update or delete a farm | Yes |
| `GET/POST` | `/api/fields/` | List or create fields | Yes |
| `PUT/DELETE` | `/api/fields/{id}/` | Update or delete a field | Yes |
| `GET/POST` | `/api/irrigation/` | List or record irrigation history | Yes |
| `GET/POST` | `/api/alerts/` | List or manage alerts | Yes |
| `GET/POST` | `/api/complaints/` | List or submit maintenance complaints | Yes |
| `GET/POST` | `/api/reports/` | List or request reports | Yes |

---

## 🔍 Features Implemented
- Custom User Model (`tbl_user`) supporting roles: `farmer`, `supervisor`, `manager`, `maintenance`, `admin`.
- JWT Token authentication with automatic Axios interceptor refresh mechanism.
- 9 modular Django apps matching exact table designs and FK relationships.
- Registered all models in Django Admin with search and filtering enabled.
