import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from master.models import CropType, CropVariety
from master.serializers import CropVarietySerializer
from farms.models import Farm, Field
from farms.serializers import FieldSerializer
from accounts.models import User

def run_test():
    print("==================================================")
    print("   CROP VARIETY SELECTION VERIFICATION TEST       ")
    print("==================================================")

    # Check 1: Existing Crop and Variety Database Integrity
    crops = CropType.objects.all()
    print(f"\n1. Total Crops in Database: {crops.count()}")
    for c in crops:
        vars_count = CropVariety.objects.filter(crop=c).count()
        var_names = list(CropVariety.objects.filter(crop=c).values_list('variety_name', flat=True))
        print(f"   • Crop '{c.name}' (ID={c.id}): {vars_count} varieties -> {var_names}")

    # Check 2: Tomato Varieties Check
    tomato = CropType.objects.filter(name__icontains='Tomato').first()
    assert tomato is not None, "Tomato crop must exist"
    tomato_vars = list(CropVariety.objects.filter(crop=tomato).values_list('variety_name', flat=True))
    print(f"\n2. Tomato (ID={tomato.id}) Varieties: {tomato_vars}")
    for expected in ['Arka Rakshak', 'Pusa Ruby', 'Abhinav Hybrid']:
        assert any(expected.lower() in v.lower() for v in tomato_vars), f"Missing expected tomato variety: {expected}"

    # Check 3: Paddy / Rice Varieties Check
    paddy = CropType.objects.filter(name__icontains='Rice').first() or CropType.objects.filter(name__icontains='Paddy').first()
    assert paddy is not None, "Paddy / Rice crop must exist"
    paddy_vars = list(CropVariety.objects.filter(crop=paddy).values_list('variety_name', flat=True))
    print(f"\n3. Paddy/Rice (ID={paddy.id}) Varieties: {paddy_vars}")
    for expected in ['Jyothi', 'Uma', 'Basmati']:
        assert any(expected.lower() in v.lower() for v in paddy_vars), f"Missing expected paddy variety: {expected}"

    # Check 4: Serializer Response Structure
    arka = CropVariety.objects.filter(variety_name__icontains='Arka Rakshak').first()
    serializer_data = CropVarietySerializer(arka).data
    print(f"\n4. Serializer output for Arka Rakshak:")
    print(f"   {serializer_data}")
    assert 'crop' in serializer_data, "Serializer MUST include 'crop' field"
    assert serializer_data['crop'] == tomato.id, f"Expected crop ID {tomato.id}, got {serializer_data['crop']}"

    # Check 5: Field Submission with Variety ID & Auto Stage
    user = User.objects.first()
    farm = Farm.objects.first()
    if not farm and user:
        farm = Farm.objects.create(farmer=user, name="Variety Test Farm", total_area=2.0)

    field_data = {
        'farm': farm.id,
        'name': 'Test Tomato Field',
        'area': 1.0,
        'crop_type': tomato.id,
        'crop_variety': arka.id,
        'planting_date': '2026-08-01',
        'crop_stage': 'germination'
    }

    fs = FieldSerializer(data=field_data)
    assert fs.is_valid(), f"FieldSerializer validation failed: {fs.errors}"
    test_field = fs.save()
    serialized_field = FieldSerializer(test_field).data

    print(f"\n5. Saved Field Serializer Data:")
    print(f"   • Crop Variety Name: {serialized_field['crop_variety_name']}")
    print(f"   • Calculated Crop Stage: {serialized_field['calculated_crop_stage_display']}")
    print(f"   • Days After Planting: {serialized_field['days_after_planting']}")

    assert serialized_field['crop_variety'] == arka.id
    assert serialized_field['crop_variety_name'] == arka.variety_name
    assert serialized_field['calculated_crop_stage'] is not None

    test_field.delete()

    print("\n==================================================")
    print("   🎉 CROP VARIETY SELECTION FIX VERIFIED!        ")
    print("==================================================")

if __name__ == '__main__':
    run_test()
