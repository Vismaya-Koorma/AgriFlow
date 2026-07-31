from django.contrib import admin
from .models import SoilMoistureEstimation, IrrigationRecommendation, CropStressRisk, IrrigationPriority


@admin.register(SoilMoistureEstimation)
class SoilMoistureAdmin(admin.ModelAdmin):
    list_display = ('field', 'estimated_moisture', 'confidence_score', 'estimated_at')
    search_fields = ('field__name',)


@admin.register(IrrigationRecommendation)
class IrrigationRecommendationAdmin(admin.ModelAdmin):
    list_display = ('field', 'recommendation_status', 'recommended_volume_litres', 'generated_at')
    list_filter = ('recommendation_status',)
    search_fields = ('field__name',)


@admin.register(CropStressRisk)
class CropStressRiskAdmin(admin.ModelAdmin):
    list_display = ('field', 'risk_level', 'stress_score', 'assessed_at')
    list_filter = ('risk_level',)
    search_fields = ('field__name',)


@admin.register(IrrigationPriority)
class IrrigationPriorityAdmin(admin.ModelAdmin):
    list_display = ('field', 'priority_score', 'priority_rank', 'generated_at')
    search_fields = ('field__name',)
