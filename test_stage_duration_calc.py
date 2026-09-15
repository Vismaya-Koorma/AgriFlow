import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from django.utils import timezone
from master.models import CropType, CropVariety, CropVarietyStageDuration
from master.services import calculate_expected_crop_stage
from farms.models import Farm, Field
from irrigation.services import calculate_crop_water_deficit
from accounts.models import User

def run_verification():
    print("==================================================")
    print("   AUTOMATIC CROP STAGE VERIFICATION SUITE       ")
    print("==================================================")

    # 1. Test Variety Stage Durations in DB
    sd_count = CropVarietyStageDuration.objects.count()
    print(f"\n1. Database Stage Duration Records Count: {sd_count}")
    assert sd_count >= 50, f"Expected at least 50 stage duration records, got {sd_count}"

    # 2. Test Arka Rakshak Tomato Stage Progression across dates
    tomato = CropType.objects.filter(name__icontains='tomato').first()
    arka = CropVariety.objects.filter(variety_name__icontains='Arka Rakshak').first()
    today = timezone.now().date()

    print(f"\n2. Testing Stage Progression for: {arka}")

    test_cases = [
        {'offset': -3, 'expected_stage': 'germination', 'desc': '3 Days After Planting'},
        {'offset': -20, 'expected_stage': 'vegetative', 'desc': '20 Days After Planting'},
        {'offset': -45, 'expected_stage': 'flowering', 'desc': '45 Days After Planting'},
        {'offset': -75, 'expected_stage': 'fruiting', 'desc': '75 Days After Planting'},
        {'offset': -110, 'expected_stage': 'harvesting', 'desc': '110 Days After Planting'},
    ]

    for tc in test_cases:
        pdate = today + timedelta(days=tc['offset'])
        res = calculate_expected_crop_stage(crop_variety=arka, planting_date=pdate, target_date=today)
        print(f"  • [{tc['desc']}] Date: {pdate} -> Stage: '{res['current_expected_stage']}' (Next: '{res['next_expected_stage_display']}' in {res['days_until_next_stage']} days)")
        assert res['current_expected_stage'] == tc['expected_stage'], f"Expected {tc['expected_stage']}, got {res['current_expected_stage']}"

    print("  ✅ All stage progression test cases passed!")

    # 3. Test Edge Cases
    print("\n3. Testing Edge Cases...")
    # Edge case 1: Future planting date
    future_date = today + timedelta(days=10)
    res_future = calculate_expected_crop_stage(crop_variety=arka, planting_date=future_date, target_date=today)
    print(f"  • Future Planting Date ({future_date}): Status='{res_future['status']}', Stage='{res_future['current_expected_stage']}'")
    assert res_future['status'] == 'future_planting_date'

    # Edge case 2: No planting date
    res_nopdate = calculate_expected_crop_stage(crop_variety=arka, planting_date=None, target_date=today, fallback_stage='flowering')
    print(f"  • No Planting Date: Status='{res_nopdate['status']}', Stage='{res_nopdate['current_expected_stage']}'")
    assert res_nopdate['current_expected_stage'] == 'flowering'

    print("  ✅ All edge case tests passed!")

    # 4. Test Irrigation Recommendation Engine Integration
    print("\n4. Testing Irrigation Engine Integration...")
    user = User.objects.first()
    farm = Farm.objects.first()
    if not farm and user:
        farm = Farm.objects.create(farmer=user, name="Stage Test Farm", total_area=3.0)

    # Create field with planting date 45 days ago (Flowering stage for Arka Rakshak)
    pdate_flowering = today - timedelta(days=45)
    test_field = Field.objects.create(
        farm=farm,
        name="Automated Stage Test Field",
        area=1.5,
        crop_type=tomato,
        crop_variety=arka,
        planting_date=pdate_flowering,
        crop_stage='germination' # Manual fallback stage in DB, should be OVERRIDDEN by automatic calculation!
    )

    irrigation_res = calculate_crop_water_deficit(field=test_field)
    print(f"  • Field Crop Stage Resolved by Engine: '{irrigation_res['crop_stage']}'")
    print(f"  • Days After Planting: {irrigation_res['days_after_planting']} days")
    print(f"  • Next Expected Stage: {irrigation_res['next_expected_stage']} in {irrigation_res['days_until_next_stage']} days")
    print(f"  • Daily Req / m²: {irrigation_res['base_daily_req_per_m2']} L/m²")
    print(f"  • Net Deficit: {irrigation_res['net_water_deficit_liters']:,} L")

    assert irrigation_res['crop_stage'].lower() == 'flowering', f"Expected engine to resolve Flowering stage, got {irrigation_res['crop_stage']}"

    test_field.delete()
    print("  ✅ Irrigation engine integration test passed!")

    print("\n==================================================")
    print("  🎉 ALL AUTOMATIC CROP STAGE TESTS PASSED!       ")
    print("==================================================")

if __name__ == '__main__':
    run_verification()
