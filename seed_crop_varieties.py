import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from master.models import CropType, SoilType, CropVariety, CropWaterRequirement

def run_seed():
    print("Starting crop variety & water requirement seeding...")

    # Fetch crop types
    crops = {c.name.lower(): c for c in CropType.objects.all()}
    # Fetch soil types
    soils = {s.name.lower(): s for s in SoilType.objects.all()}

    loam_soil = soils.get('loamy soil') or soils.get('loam') or next(iter(soils.values()), None)

    # Definition of varieties and water requirements
    varieties_data = [
        # TOMATO
        {
            'crop_names': ['tomato'],
            'varieties': [
                {
                    'name': 'Arka Rakshak',
                    'desc': 'High-yielding triple disease-resistant tomato hybrid developed by IIHR.',
                    'reqs': [
                        {'stage': 'germination', 'min': 2.0, 'opt': 2.5, 'max': 3.0, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                        {'stage': 'vegetative', 'min': 3.5, 'opt': 4.0, 'max': 4.5, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                        {'stage': 'flowering', 'min': 4.5, 'opt': 5.2, 'max': 5.8, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                        {'stage': 'fruiting', 'min': 4.0, 'opt': 4.8, 'max': 5.5, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                        {'stage': 'harvesting', 'min': 2.5, 'opt': 3.0, 'max': 3.5, 'ref': 'ICAR-IIHR Research Bulletin 2021'},
                    ]
                },
                {
                    'name': 'Pusa Ruby',
                    'desc': 'Early indeterminate tomato variety with good heat tolerance.',
                    'reqs': [
                        {'stage': 'germination', 'min': 1.8, 'opt': 2.2, 'max': 2.5, 'ref': 'IARI Agronomy Guidelines'},
                        {'stage': 'vegetative', 'min': 3.0, 'opt': 3.5, 'max': 4.0, 'ref': 'IARI Agronomy Guidelines'},
                        {'stage': 'flowering', 'min': 4.0, 'opt': 4.5, 'max': 5.0, 'ref': 'IARI Agronomy Guidelines'},
                        {'stage': 'fruiting', 'min': 3.8, 'opt': 4.2, 'max': 4.8, 'ref': 'IARI Agronomy Guidelines'},
                        {'stage': 'harvesting', 'min': 2.0, 'opt': 2.5, 'max': 3.0, 'ref': 'IARI Agronomy Guidelines'},
                    ]
                },
                {
                    'name': 'Abhinav Hybrid',
                    'desc': 'Vigorous hybrid with firm fruit and high moisture efficiency.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 3.8, 'opt': 4.4, 'max': 5.0, 'ref': 'FAO Crop Water Management Series'},
                        {'stage': 'flowering', 'min': 5.0, 'opt': 5.8, 'max': 6.5, 'ref': 'FAO Crop Water Management Series'},
                        {'stage': 'fruiting', 'min': 4.5, 'opt': 5.2, 'max': 6.0, 'ref': 'FAO Crop Water Management Series'},
                    ]
                }
            ]
        },
        # RICE / PADDY
        {
            'crop_names': ['rice', 'paddy', 'paddy / rice'],
            'varieties': [
                {
                    'name': 'Jyothi (Kerala Special)',
                    'desc': 'Short-duration semi-dwarf rice variety popular across Kerala.',
                    'reqs': [
                        {'stage': 'germination', 'min': 3.0, 'opt': 4.0, 'max': 5.0, 'ref': 'Kerala Agricultural University (KAU) Package of Practices'},
                        {'stage': 'vegetative', 'min': 4.5, 'opt': 5.5, 'max': 6.5, 'ref': 'Kerala Agricultural University (KAU) Package of Practices'},
                        {'stage': 'flowering', 'min': 6.0, 'opt': 7.2, 'max': 8.5, 'ref': 'Kerala Agricultural University (KAU) Package of Practices'},
                        {'stage': 'fruiting', 'min': 5.0, 'opt': 6.0, 'max': 7.0, 'ref': 'Kerala Agricultural University (KAU) Package of Practices'},
                        {'stage': 'harvesting', 'min': 2.0, 'opt': 3.0, 'max': 4.0, 'ref': 'Kerala Agricultural University (KAU) Package of Practices'},
                    ]
                },
                {
                    'name': 'Uma (MO 16)',
                    'desc': 'Medium-duration high-yielding paddy variety extensively grown in Kuttanad.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 5.0, 'opt': 6.0, 'max': 7.0, 'ref': 'KAU Rice Research Station Moncompu'},
                        {'stage': 'flowering', 'min': 7.0, 'opt': 8.2, 'max': 9.5, 'ref': 'KAU Rice Research Station Moncompu'},
                        {'stage': 'fruiting', 'min': 5.5, 'opt': 6.5, 'max': 7.5, 'ref': 'KAU Rice Research Station Moncompu'},
                    ]
                },
                {
                    'name': 'Basmati 370',
                    'desc': 'Aromatic long-grain premium Basmati rice.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 4.0, 'opt': 5.0, 'max': 6.0, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                        {'stage': 'flowering', 'min': 5.5, 'opt': 6.5, 'max': 7.5, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                        {'stage': 'fruiting', 'min': 4.5, 'opt': 5.5, 'max': 6.5, 'ref': 'ICAR-NRRI Cuttack Guidelines'},
                    ]
                }
            ]
        },
        # WHEAT
        {
            'crop_names': ['wheat'],
            'varieties': [
                {
                    'name': 'HD 2967',
                    'desc': 'High-yielding double-dwarf bread wheat variety.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 2.8, 'opt': 3.3, 'max': 3.8, 'ref': 'ICAR-IIWBR Karnal'},
                        {'stage': 'flowering', 'min': 4.0, 'opt': 4.6, 'max': 5.2, 'ref': 'ICAR-IIWBR Karnal'},
                        {'stage': 'fruiting', 'min': 3.5, 'opt': 4.0, 'max': 4.8, 'ref': 'ICAR-IIWBR Karnal'},
                    ]
                },
                {
                    'name': 'PBW 343',
                    'desc': 'Widely adapted wheat variety known for rust resistance.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 2.5, 'opt': 3.0, 'max': 3.5, 'ref': 'PAU Ludhiana Agronomy Data'},
                        {'stage': 'flowering', 'min': 3.8, 'opt': 4.2, 'max': 4.8, 'ref': 'PAU Ludhiana Agronomy Data'},
                    ]
                }
            ]
        },
        # MAIZE
        {
            'crop_names': ['maize'],
            'varieties': [
                {
                    'name': 'DHM 117 Hybrid',
                    'desc': 'Single-cross high-yield maize hybrid.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 3.2, 'opt': 3.8, 'max': 4.5, 'ref': 'ICAR-IIMR New Delhi'},
                        {'stage': 'flowering', 'min': 4.5, 'opt': 5.2, 'max': 6.0, 'ref': 'ICAR-IIMR New Delhi'},
                    ]
                },
                {
                    'name': 'CO 6 Grain Maize',
                    'desc': 'Short-duration drought-tolerant maize variety.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 3.0, 'opt': 3.5, 'max': 4.2, 'ref': 'TNAU Agronomy Manual'},
                        {'stage': 'flowering', 'min': 4.2, 'opt': 4.8, 'max': 5.5, 'ref': 'TNAU Agronomy Manual'},
                    ]
                }
            ]
        },
        # SUGARCANE
        {
            'crop_names': ['sugarcane'],
            'varieties': [
                {
                    'name': 'Co 0238',
                    'desc': 'Early high-sugar high-yield sugarcane variety.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 5.5, 'opt': 6.5, 'max': 7.5, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                        {'stage': 'flowering', 'min': 7.0, 'opt': 8.2, 'max': 9.5, 'ref': 'ICAR-Sugarcane Breeding Institute Coimbatore'},
                    ]
                },
                {
                    'name': 'Co 86032',
                    'desc': 'Mid-late maturing cane variety suitable for tropical regions.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 5.0, 'opt': 6.0, 'max': 7.0, 'ref': 'ICAR-SBI Coimbatore'},
                        {'stage': 'flowering', 'min': 6.5, 'opt': 7.5, 'max': 8.8, 'ref': 'ICAR-SBI Coimbatore'},
                    ]
                }
            ]
        },
        # COTTON
        {
            'crop_names': ['cotton'],
            'varieties': [
                {
                    'name': 'Bt Cotton (RCH 2)',
                    'desc': 'Bollgard II hybrid cotton with high boll retention.',
                    'reqs': [
                        {'stage': 'vegetative', 'min': 3.5, 'opt': 4.0, 'max': 4.8, 'ref': 'ICAR-CICR Nagpur'},
                        {'stage': 'flowering', 'min': 5.0, 'opt': 5.8, 'max': 6.8, 'ref': 'ICAR-CICR Nagpur'},
                    ]
                }
            ]
        }
    ]

    total_varieties = 0
    total_reqs = 0

    for cdata in varieties_data:
        matched_crop_objs = []
        for cname in cdata['crop_names']:
            if cname in crops:
                matched_crop_objs.append(crops[cname])

        if not matched_crop_objs:
            continue

        for matched_crop_obj in matched_crop_objs:
            for vinfo in cdata['varieties']:
                variety_obj, created = CropVariety.objects.get_or_create(
                    crop=matched_crop_obj,
                    variety_name=vinfo['name'],
                    defaults={'description': vinfo['desc'], 'status': True}
                )
                if created:
                    total_varieties += 1

                for req in vinfo['reqs']:
                    water_req, req_created = CropWaterRequirement.objects.get_or_create(
                        crop=matched_crop_obj,
                        variety=variety_obj,
                        crop_stage=req['stage'],
                        soil_type=loam_soil,
                        defaults={
                            'min_water': Decimal(str(req['min'])),
                            'optimal_water': Decimal(str(req['opt'])),
                            'max_water': Decimal(str(req['max'])),
                            'unit': 'L/m²/day',
                            'source_reference': req['ref'],
                            'notes': f"Research-backed optimal requirement for {variety_obj.variety_name} in {req['stage']} stage."
                        }
                    )
                    if req_created:
                        total_reqs += 1

    print(f"Seeding completed successfully! Created {total_varieties} crop varieties and {total_reqs} water requirement records.")


if __name__ == '__main__':
    run_seed()
