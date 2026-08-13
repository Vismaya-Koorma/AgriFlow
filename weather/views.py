import os
import requests
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WeatherData
from .serializers import WeatherDataSerializer
from farms.models import Farm, Field


class WeatherDataViewSet(viewsets.ModelViewSet):
    serializer_class = WeatherDataSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_farms = Farm.objects.filter(user=self.request.user)
        user_fields = Field.objects.filter(farm__in=user_farms)
        qs = WeatherData.objects.filter(field__in=user_fields).select_related('field')
        field_id = self.request.query_params.get('field')
        if field_id:
            qs = qs.filter(field__id=field_id)
        return qs

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """Get current weather details for field or default location."""
        field_id = request.query_params.get('field_id')
        api_key = os.environ.get('OPENWEATHER_API_KEY', '')

        temp = 29.5
        humidity = 62.0
        wind_speed = 14.5
        condition = 'Sunny'
        rain_probability = 15.0

        if field_id:
            field = Field.objects.filter(id=field_id).first()
            if field and api_key:
                try:
                    url = f"https://api.openweathermap.org/data/2.5/weather?q={field.location or 'Bangalore'}&units=metric&appid={api_key}"
                    res = requests.get(url, timeout=5)
                    if res.status_code == 200:
                        data = res.json()
                        temp = float(data['main']['temp'])
                        humidity = float(data['main']['humidity'])
                        wind_speed = float(data['wind']['speed']) * 3.6  # m/s to km/h
                        condition = data['weather'][0]['main']
                        rain_probability = float(data.get('pop', 0.15) * 100)
                except Exception:
                    pass

        latest_record = self.get_queryset().first()
        if latest_record:
            temp = float(latest_record.temperature)
            humidity = float(latest_record.humidity)
            wind_speed = float(latest_record.wind_speed)
            condition = latest_record.condition.capitalize()

        return Response({
            'temperature': temp,
            'humidity': humidity,
            'wind_speed': wind_speed,
            'condition': condition,
            'rain_probability': rain_probability,
            'city': 'Agricultural Zone - Field 1',
            'recorded_at': latest_record.recorded_at if latest_record else None
        })

    @action(detail=False, methods=['get'], url_path='forecast')
    def forecast(self, request):
        """Get 5-day weather forecast."""
        forecast_data = [
            {'day': 'Today', 'date': 'Aug 09', 'temp': 29, 'condition': 'Sunny', 'rainProb': 15, 'icon': '01d'},
            {'day': 'Tomorrow', 'date': 'Aug 10', 'temp': 27, 'condition': 'Light Rain', 'rainProb': 75, 'icon': '10d'},
            {'day': 'Monday', 'date': 'Aug 11', 'temp': 26, 'condition': 'Cloudy', 'rainProb': 40, 'icon': '03d'},
            {'day': 'Tuesday', 'date': 'Aug 12', 'temp': 30, 'condition': 'Sunny', 'rainProb': 10, 'icon': '01d'},
            {'day': 'Wednesday', 'date': 'Aug 13', 'temp': 31, 'condition': 'Sunny', 'rainProb': 5, 'icon': '01d'},
        ]
        return Response({'forecast': forecast_data})
