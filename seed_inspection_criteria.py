import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agriflow_backend.settings')
django.setup()

from farms.models import FieldInspectionCriterion

DEFAULT_CRITERIA = [
    {
        'category': FieldInspectionCriterion.Category.CROP_HEALTH,
        'name': 'Plant Canopy Vigour & Uniformity',
        'description': 'Assess vegetative vigour, foliage density, leaf coloration, and stand uniformity across the field plot.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Canopy must demonstrate healthy green coloration and consistent stand density (>80% uniformity).',
        'threshold_unit': '%',
        'min_threshold': 80.0,
        'max_threshold': 100.0,
        'order': 1,
    },
    {
        'category': FieldInspectionCriterion.Category.CROP_HEALTH,
        'name': 'Vegetative / Reproductive Stage Alignment',
        'description': 'Verify actual physiological crop stage matches expected crop variety growth duration baseline.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Crop stage corresponds to recorded planting date without abnormal physiological stunting.',
        'threshold_unit': None,
        'order': 2,
    },
    {
        'category': FieldInspectionCriterion.Category.IRRIGATION_WATER,
        'name': 'Water Source Adequacy & Supply Reliability',
        'description': 'Check operational availability of water source (canal branch, borewell, or storage pond) and delivery capacity.',
        'is_mandatory': True,
        'is_critical': True,
        'acceptance_guideline': 'Water source must be active and sufficient to meet crop water requirements without acute depletion.',
        'threshold_unit': None,
        'order': 3,
    },
    {
        'category': FieldInspectionCriterion.Category.IRRIGATION_WATER,
        'name': 'Irrigation Distribution & Moisture Uniformity',
        'description': 'Assess whether water is evenly distributed across rows without severe dry patches or unintended runoff.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Even moisture distribution across field sectors without visible drought stress signs.',
        'threshold_unit': '%',
        'min_threshold': 50.0,
        'max_threshold': 90.0,
        'order': 4,
    },
    {
        'category': FieldInspectionCriterion.Category.SOIL_DRAINAGE,
        'name': 'Soil Drainage & Absence of Severe Waterlogging',
        'description': 'Ensure field plot has adequate drainage slope and channels; absence of prolonged root zone inundation.',
        'is_mandatory': True,
        'is_critical': True,
        'acceptance_guideline': 'No stagnant waterlogging exceeding crop tolerance (sub-surface drainage functioning).',
        'threshold_unit': None,
        'order': 5,
    },
    {
        'category': FieldInspectionCriterion.Category.SOIL_DRAINAGE,
        'name': 'Soil Tilth, Structure & Root Zone Health',
        'description': 'Inspect surface crusting, soil compaction, salinity signs, and physical condition suitable for healthy root aeration.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Soil structure provides adequate friability and aeration for the established crop.',
        'threshold_unit': None,
        'order': 6,
    },
    {
        'category': FieldInspectionCriterion.Category.PEST_DISEASE,
        'name': 'Absence of Quarantine / Severe Pathogen Outbreak',
        'description': 'Inspect for catastrophic disease epidemics, systemic bacterial/viral wilt, or quarantine invasive pest outbreaks.',
        'is_mandatory': True,
        'is_critical': True,
        'acceptance_guideline': 'Zero unchecked virulent epidemics; field is contained and poses no quarantine hazard.',
        'threshold_unit': None,
        'order': 7,
    },
    {
        'category': FieldInspectionCriterion.Category.PEST_DISEASE,
        'name': 'Pest Infestation Below Economic Injury Level',
        'description': 'Scout foliage and stems for insect pests, aphids, borers, or foliar fungal spots within manageable thresholds.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Pest or pathogen damage below 15% leaf surface area, manageable with standard IPM measures.',
        'threshold_unit': '%',
        'min_threshold': 0.0,
        'max_threshold': 15.0,
        'order': 8,
    },
    {
        'category': FieldInspectionCriterion.Category.FERTILIZER_PRACTICES,
        'name': 'Balanced Nutrient & Fertilizer Application',
        'description': 'Verify proper nutrient scheduling (NPK + micronutrients) and absence of severe nutrient deficiency symptoms.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Adherence to recommended nutrient regime without chlorosis, purpling, or necrosis.',
        'threshold_unit': None,
        'order': 9,
    },
    {
        'category': FieldInspectionCriterion.Category.FERTILIZER_PRACTICES,
        'name': 'Standard Agronomic & Mulching Practices',
        'description': 'Inspect planting geometry, plant density, mulching, and sustainable soil conservation practices.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Correct row-to-row spacing and agronomic practices suitable for the registered variety.',
        'threshold_unit': None,
        'order': 10,
    },
    {
        'category': FieldInspectionCriterion.Category.FIELD_MAINTENANCE,
        'name': 'Weed Management & Boundary Cleanliness',
        'description': 'Evaluate weed pressure, invasive weeds, and boundary cleanliness to reduce pest harbourage.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Weed coverage within manageable levels without choking main crop rows (<20%).',
        'threshold_unit': '%',
        'min_threshold': 0.0,
        'max_threshold': 20.0,
        'order': 11,
    },
    {
        'category': FieldInspectionCriterion.Category.FIELD_MAINTENANCE,
        'name': 'Field Bund Integrity & Erosion Protection',
        'description': 'Inspect boundary bunds, containment ridges, and soil erosion control barriers.',
        'is_mandatory': True,
        'is_critical': False,
        'acceptance_guideline': 'Bunds structurally intact without major breaches causing irrigation runoff loss.',
        'threshold_unit': None,
        'order': 12,
    },
    {
        'category': FieldInspectionCriterion.Category.CORRECTIVE_ACTIONS,
        'name': 'Resolution of Past Inspection Deficiencies',
        'description': 'Verify whether corrective actions issued during previous inspections or field visits have been remediated.',
        'is_mandatory': False,
        'is_critical': True,
        'acceptance_guideline': 'All outstanding mandatory corrective actions from previous visits resolved or adequately in progress.',
        'threshold_unit': None,
        'order': 13,
    },
]

def seed():
    created_count = 0
    updated_count = 0
    for crit_data in DEFAULT_CRITERIA:
        obj, created = FieldInspectionCriterion.objects.update_or_create(
            name=crit_data['name'],
            defaults=crit_data
        )
        if created:
            created_count += 1
        else:
            updated_count += 1
    print(f"Seed completed: {created_count} created, {updated_count} updated. Total active: {FieldInspectionCriterion.objects.count()}")

if __name__ == '__main__':
    seed()
