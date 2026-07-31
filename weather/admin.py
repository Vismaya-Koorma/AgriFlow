from django.contrib import admin
from .models import WeatherData


@admin.register(WeatherData)
class WeatherDataAdmin(admin.ModelAdmin):
    list_display = ('field', 'temperature', 'humidity', 'rainfall', 'condition', 'recorded_at')
    list_filter = ('condition', 'field__farm')
    search_fields = ('field__name',)
    ordering = ('-recorded_at',)
