import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from master.models import CropType, SoilType

crops = [
    {'name': 'Rice', 'crop_value': 45.00, 'description': 'Paddy rice crop', 'status': True},
    {'name': 'Wheat', 'crop_value': 32.00, 'description': 'Wheat grain crop', 'status': True},
    {'name': 'Maize', 'crop_value': 28.00, 'description': 'Corn/Maize crop', 'status': True},
    {'name': 'Sugarcane', 'crop_value': 55.00, 'description': 'Sugar producing crop', 'status': True},
    {'name': 'Cotton', 'crop_value': 65.00, 'description': 'Fiber cotton crop', 'status': True},
    {'name': 'Coconut', 'crop_value': 80.00, 'description': 'Coconut palm crop', 'status': True},
    {'name': 'Banana', 'crop_value': 35.00, 'description': 'Banana fruit crop', 'status': True},
    {'name': 'Tomato', 'crop_value': 25.00, 'description': 'Tomato vegetable crop', 'status': True},
    {'name': 'Pepper', 'crop_value': 90.00, 'description': 'Black pepper spice crop', 'status': True},
    {'name': 'Tapioca', 'crop_value': 20.00, 'description': 'Cassava/Tapioca root crop', 'status': True},
]

soils = [
    {'name': 'Clay Soil', 'description': 'Heavy soil with fine particles, retains water well', 'water_retention': 'High', 'status': True},
    {'name': 'Sandy Soil', 'description': 'Light soil with coarse particles, drains quickly', 'water_retention': 'Low', 'status': True},
    {'name': 'Loamy Soil', 'description': 'Balanced soil mixture, ideal for most crops', 'water_retention': 'Medium', 'status': True},
    {'name': 'Silty Soil', 'description': 'Smooth soil with medium particle size', 'water_retention': 'Medium-High', 'status': True},
    {'name': 'Peaty Soil', 'description': 'Dark, moisture-rich organic soil', 'water_retention': 'Very High', 'status': True},
    {'name': 'Chalky Soil', 'description': 'Alkaline soil with calcium carbonate', 'water_retention': 'Low-Medium', 'status': True},
    {'name': 'Red Laterite', 'description': 'Iron-rich tropical soil common in Kerala', 'water_retention': 'Low', 'status': True},
    {'name': 'Black Cotton Soil', 'description': 'Dark soil ideal for cotton crops', 'water_retention': 'High', 'status': True},
]

for c in crops:
    obj, created = CropType.objects.get_or_create(name=c['name'], defaults=c)
    print("CropType '{}': {}".format(c['name'], 'created' if created else 'already exists'))

for s in soils:
    obj, created = SoilType.objects.get_or_create(name=s['name'], defaults=s)
    print("SoilType '{}': {}".format(s['name'], 'created' if created else 'already exists'))

print("Total CropTypes: {}".format(CropType.objects.count()))
print("Total SoilTypes: {}".format(SoilType.objects.count()))
