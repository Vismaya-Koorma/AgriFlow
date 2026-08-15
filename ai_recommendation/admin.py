from django.contrib import admin
from .models import AIRecommendationLog


@admin.register(AIRecommendationLog)
class AIRecommendationLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'field', 'farm', 'irrigation_needed', 'crop_stress', 'confidence', 'created_at']
    list_filter = ['irrigation_needed', 'crop_stress', 'created_at']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
