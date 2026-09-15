import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from farms.models import Field
from farms.serializers import FieldSerializer
from master.models import CropVariety, CropVarietyStageDuration
from master.services import calculate_expected_crop_stage

def debug():
    fields = Field.objects.all()
    with open('debug_output.txt', 'w', encoding='utf-8') as out:
        out.write(f"Total Fields in DB: {fields.count()}\n\n")

        for f in fields:
            out.write(f"--- Field ID: {f.id} | Name: '{f.name}' ---\n")
            out.write(f"  Crop Type: {f.crop_type}\n")
            out.write(f"  Crop Variety: {f.crop_variety}\n")
            out.write(f"  Planting Date: {f.planting_date}\n")
            out.write(f"  Stored crop_stage (manual DB column): '{f.crop_stage}'\n")

            if f.crop_variety:
                durations = list(f.crop_variety.stage_durations.order_by('start_day'))
                out.write(f"  Variety '{f.crop_variety.variety_name}' stage durations count: {len(durations)}\n")
                for d in durations:
                    out.write(f"    - Stage: {d.stage} ({d.start_day} to {d.end_day})\n")
            else:
                out.write("  NO CROP VARIETY ASSIGNED!\n")

            calc = calculate_expected_crop_stage(crop_variety=f.crop_variety, planting_date=f.planting_date, fallback_stage=f.crop_stage or 'vegetative')
            out.write(f"  Calculation Output: {calc}\n")

            ser = FieldSerializer(f).data
            out.write(f"  Serializer Output:\n")
            out.write(f"    - crop_stage: {ser.get('crop_stage')}\n")
            out.write(f"    - days_after_planting: {ser.get('days_after_planting')}\n")
            out.write(f"    - calculated_crop_stage: {ser.get('calculated_crop_stage')}\n")
            out.write(f"    - calculated_crop_stage_display: {ser.get('calculated_crop_stage_display')}\n")
            out.write("\n")

if __name__ == '__main__':
    debug()
