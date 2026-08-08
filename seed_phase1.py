import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from accounts.models import User
from farms.models import Farm, Field
from master.models import SoilType, CropType
from irrigation.models import IrrigationHistory, RainfallConfirmation
from weather.models import WeatherData
from alerts.models import Alert
from recommendation.models import IrrigationRecommendation

farmer = User.objects.filter(username='farmer').first()
if not farmer:
    print("Run seed_users.py first!")
    exit(1)

# Ensure sample farm and field exist
farm, _ = Farm.objects.get_or_create(
    user=farmer,
    name="Green Acres Farm",
    defaults={'location': 'Alappuzha, Kerala', 'total_area': 12.5}
)

field1, _ = Field.objects.get_or_create(
    farm=farm,
    name="North Paddy Field",
    defaults={'area': 5.0, 'status': True}
)

field2, _ = Field.objects.get_or_create(
    farm=farm,
    name="South Maize Block",
    defaults={'area': 4.0, 'status': True}
)

# Seed sample irrigation history
if not IrrigationHistory.objects.filter(field=field1).exists():
    IrrigationHistory.objects.create(
        field=field1,
        method='drip',
        water_source='canal',
        volume_litres=1200.00,
        duration_minutes=45,
        created_by=farmer,
        notes='Morning drip irrigation cycle executed successfully.'
    )
    IrrigationHistory.objects.create(
        field=field1,
        method='sprinkler',
        water_source='borewell',
        volume_litres=1800.00,
        duration_minutes=60,
        created_by=farmer,
        notes='Evening sprinkler supplemental watering.'
    )
    print("Seeded Irrigation History records.")

# Seed rainfall confirmation
if not RainfallConfirmation.objects.filter(field=field1).exists():
    RainfallConfirmation.objects.create(
        field=field1,
        rainfall_option='light_rain',
        rainfall_mm=5.0,
        confirmed_by=farmer,
        notes='Light rain observed in the afternoon.'
    )
    print("Seeded Rainfall Confirmation.")

# Seed Alerts
if not Alert.objects.filter(field=field1).exists():
    Alert.objects.create(
        field=field1,
        alert_type='weather',
        severity='high',
        title='Rain expected tomorrow',
        message='75% probability of rain tomorrow. Postpone scheduled irrigation.'
    )
    Alert.objects.create(
        field=field1,
        alert_type='irrigation',
        severity='medium',
        title='No irrigation for several days',
        message='Field 2 has not been irrigated for 3 days.'
    )
    print("Seeded Alerts.")

print("Phase 1 database seeding complete!")
