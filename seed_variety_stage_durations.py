import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from master.models import CropType, CropVariety, CropVarietyStageDuration

def run_seed():
    print("Starting crop variety stage duration seeding...")

    crops = {c.name.lower(): c for c in CropType.objects.all()}

    # Variety Stage Duration Definitions (Research-Backed)
    # Stage Choices: germination, vegetative, flowering, fruiting, harvesting
    stage_data = [
        # TOMATO
        {
            'varieties': ['Arka Rakshak'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 7, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                {'stage': 'vegetative', 'start': 8, 'end': 35, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                {'stage': 'flowering', 'start': 36, 'end': 60, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                {'stage': 'fruiting', 'start': 61, 'end': 90, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                {'stage': 'harvesting', 'start': 91, 'end': 130, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
            ]
        },
        {
            'varieties': ['Pusa Ruby'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 6, 'ref': 'IARI Agronomy Guidelines'},
                {'stage': 'vegetative', 'start': 7, 'end': 30, 'ref': 'IARI Agronomy Guidelines'},
                {'stage': 'flowering', 'start': 31, 'end': 50, 'ref': 'IARI Agronomy Guidelines'},
                {'stage': 'fruiting', 'start': 51, 'end': 80, 'ref': 'IARI Agronomy Guidelines'},
                {'stage': 'harvesting', 'start': 81, 'end': 115, 'ref': 'IARI Agronomy Guidelines'},
            ]
        },
        {
            'varieties': ['Abhinav Hybrid'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 7, 'ref': 'FAO Crop Water Management Series'},
                {'stage': 'vegetative', 'start': 8, 'end': 35, 'ref': 'FAO Crop Water Management Series'},
                {'stage': 'flowering', 'start': 36, 'end': 55, 'ref': 'FAO Crop Water Management Series'},
                {'stage': 'fruiting', 'start': 56, 'end': 95, 'ref': 'FAO Crop Water Management Series'},
                {'stage': 'harvesting', 'start': 96, 'end': 135, 'ref': 'FAO Crop Water Management Series'},
            ]
        },

        # RICE / PADDY
        {
            'varieties': ['Jyothi (Kerala Special)', 'Jyothi'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 10, 'ref': 'Kerala Agricultural University (KAU) Package of Practices 2024'},
                {'stage': 'vegetative', 'start': 11, 'end': 45, 'ref': 'Kerala Agricultural University (KAU) Package of Practices 2024'},
                {'stage': 'flowering', 'start': 46, 'end': 75, 'ref': 'Kerala Agricultural University (KAU) Package of Practices 2024'},
                {'stage': 'fruiting', 'start': 76, 'end': 105, 'ref': 'Kerala Agricultural University (KAU) Package of Practices 2024'},
                {'stage': 'harvesting', 'start': 106, 'end': 125, 'ref': 'Kerala Agricultural University (KAU) Package of Practices 2024'},
            ]
        },
        {
            'varieties': ['Uma (MO 16)', 'Uma'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 10, 'ref': 'KAU Rice Research Station Moncompu'},
                {'stage': 'vegetative', 'start': 11, 'end': 50, 'ref': 'KAU Rice Research Station Moncompu'},
                {'stage': 'flowering', 'start': 51, 'end': 85, 'ref': 'KAU Rice Research Station Moncompu'},
                {'stage': 'fruiting', 'start': 86, 'end': 120, 'ref': 'KAU Rice Research Station Moncompu'},
                {'stage': 'harvesting', 'start': 121, 'end': 140, 'ref': 'KAU Rice Research Station Moncompu'},
            ]
        },
        {
            'varieties': ['Basmati 370'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 10, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                {'stage': 'vegetative', 'start': 11, 'end': 55, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                {'stage': 'flowering', 'start': 56, 'end': 90, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                {'stage': 'fruiting', 'start': 91, 'end': 125, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                {'stage': 'harvesting', 'start': 126, 'end': 145, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
            ]
        },

        # WHEAT
        {
            'varieties': ['HD 2967'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 10, 'ref': 'ICAR-IIWBR Karnal'},
                {'stage': 'vegetative', 'start': 11, 'end': 45, 'ref': 'ICAR-IIWBR Karnal'},
                {'stage': 'flowering', 'start': 46, 'end': 75, 'ref': 'ICAR-IIWBR Karnal'},
                {'stage': 'fruiting', 'start': 76, 'end': 110, 'ref': 'ICAR-IIWBR Karnal'},
                {'stage': 'harvesting', 'start': 111, 'end': 135, 'ref': 'ICAR-IIWBR Karnal'},
            ]
        },
        {
            'varieties': ['PBW 343'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 10, 'ref': 'PAU Ludhiana Agronomy Data'},
                {'stage': 'vegetative', 'start': 11, 'end': 40, 'ref': 'PAU Ludhiana Agronomy Data'},
                {'stage': 'flowering', 'start': 41, 'end': 70, 'ref': 'PAU Ludhiana Agronomy Data'},
                {'stage': 'fruiting', 'start': 71, 'end': 105, 'ref': 'PAU Ludhiana Agronomy Data'},
                {'stage': 'harvesting', 'start': 106, 'end': 130, 'ref': 'PAU Ludhiana Agronomy Data'},
            ]
        },

        # MAIZE
        {
            'varieties': ['DHM 117 Hybrid', 'DHM 117'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 7, 'ref': 'ICAR-IIMR New Delhi'},
                {'stage': 'vegetative', 'start': 8, 'end': 35, 'ref': 'ICAR-IIMR New Delhi'},
                {'stage': 'flowering', 'start': 36, 'end': 60, 'ref': 'ICAR-IIMR New Delhi'},
                {'stage': 'fruiting', 'start': 61, 'end': 90, 'ref': 'ICAR-IIMR New Delhi'},
                {'stage': 'harvesting', 'start': 91, 'end': 115, 'ref': 'ICAR-IIMR New Delhi'},
            ]
        },
        {
            'varieties': ['CO 6 Grain Maize', 'CO 6'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 7, 'ref': 'TNAU Agronomy Manual'},
                {'stage': 'vegetative', 'start': 8, 'end': 30, 'ref': 'TNAU Agronomy Manual'},
                {'stage': 'flowering', 'start': 31, 'end': 55, 'ref': 'TNAU Agronomy Manual'},
                {'stage': 'fruiting', 'start': 56, 'end': 80, 'ref': 'TNAU Agronomy Manual'},
                {'stage': 'harvesting', 'start': 81, 'end': 105, 'ref': 'TNAU Agronomy Manual'},
            ]
        },

        # SUGARCANE
        {
            'varieties': ['Co 0238'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 30, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                {'stage': 'vegetative', 'start': 31, 'end': 150, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                {'stage': 'flowering', 'start': 151, 'end': 240, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                {'stage': 'fruiting', 'start': 241, 'end': 300, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                {'stage': 'harvesting', 'start': 301, 'end': 360, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
            ]
        },
        {
            'varieties': ['Co 86032'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 35, 'ref': 'ICAR-SBI Coimbatore'},
                {'stage': 'vegetative', 'start': 36, 'end': 160, 'ref': 'ICAR-SBI Coimbatore'},
                {'stage': 'flowering', 'start': 161, 'end': 250, 'ref': 'ICAR-SBI Coimbatore'},
                {'stage': 'fruiting', 'start': 251, 'end': 315, 'ref': 'ICAR-SBI Coimbatore'},
                {'stage': 'harvesting', 'start': 316, 'end': 365, 'ref': 'ICAR-SBI Coimbatore'},
            ]
        },

        # COTTON
        {
            'varieties': ['Bt Cotton (RCH 2)', 'Bt Cotton'],
            'durations': [
                {'stage': 'germination', 'start': 0, 'end': 12, 'ref': 'ICAR-CICR Nagpur'},
                {'stage': 'vegetative', 'start': 13, 'end': 45, 'ref': 'ICAR-CICR Nagpur'},
                {'stage': 'flowering', 'start': 46, 'end': 80, 'ref': 'ICAR-CICR Nagpur'},
                {'stage': 'fruiting', 'start': 81, 'end': 130, 'ref': 'ICAR-CICR Nagpur'},
                {'stage': 'harvesting', 'start': 131, 'end': 165, 'ref': 'ICAR-CICR Nagpur'},
            ]
        }
    ]

    total_created = 0

    all_varieties = CropVariety.objects.all()
    print(f"Found {all_varieties.count()} existing crop varieties in database.")

    for item in stage_data:
        target_varieties = []
        for vname in item['varieties']:
            found = all_varieties.filter(variety_name__icontains=vname)
            target_varieties.extend(list(found))

        # Remove duplicates
        target_varieties = list(set(target_varieties))

        for variety_obj in target_varieties:
            for d in item['durations']:
                sd_obj, created = CropVarietyStageDuration.objects.get_or_create(
                    crop_variety=variety_obj,
                    stage=d['stage'],
                    defaults={
                        'start_day': d['start'],
                        'end_day': d.get('end'),
                        'source_reference': d.get('ref', ''),
                        'notes': f"Standard verified agricultural duration for {variety_obj.variety_name} ({d['stage']})."
                    }
                )
                if created:
                    total_created += 1

    print(f"Stage duration seeding completed! Seeded {total_created} variety stage duration records.")

if __name__ == '__main__':
    run_seed()
