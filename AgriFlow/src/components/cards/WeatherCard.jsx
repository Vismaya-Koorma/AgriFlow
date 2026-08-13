import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, CircularProgress, Chip, Stack, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import AirIcon from '@mui/icons-material/Air';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import { getCurrentWeather, getWeatherForecast } from '../../services/api';

const WeatherCard = ({ fieldId = null }) => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherData();
  }, [fieldId]);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      const [curr, fc] = await Promise.all([
        getCurrentWeather(fieldId),
        getWeatherForecast(fieldId),
      ]);
      setCurrentWeather(curr);
      setForecast(fc.forecast || fc || []);
    } catch (e) {
      console.error('Error fetching weather:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress color="success" size={32} />
      </Card>
    );
  }

  const weather = currentWeather || {
    city: 'Alappuzha',
    temperature: 29.5,
    humidity: 78,
    rain_probability: 65,
    wind_speed: 12.4,
    condition: 'Partly Cloudy',
    icon: '02d'
  };

  return (
    <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WbSunnyIcon sx={{ color: '#eab308', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534' }}>
            Weather Forecast ({weather.city || 'Alappuzha'})
          </Typography>
        </Box>
        <Chip label={weather.condition || 'Clear'} color="success" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>

      {/* Primary Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <ThermostatIcon sx={{ color: '#ef4444', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Temperature</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{weather.temperature}°C</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <OpacityIcon sx={{ color: '#0284c7', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Humidity</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{weather.humidity}%</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <ThunderstormIcon sx={{ color: '#2563eb', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Rain Chance</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{weather.rain_probability}%</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <AirIcon sx={{ color: '#059669', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Wind Speed</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{weather.wind_speed} km/h</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* 5-Day Forecast Accordion */}
      <Accordion elevation={0} sx={{ border: '1px solid #dcfce7', borderRadius: '12px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#166534' }} />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#166534' }}>
            View 5-Day Agricultural Forecast
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1}>
            {forecast.map((day, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: idx !== forecast.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, width: 80 }}>{day.day || day.date}</Typography>
                <Typography variant="body2" color="text.secondary">{day.condition}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{day.temp_max}° / {day.temp_min}°C</Typography>
                <Chip label={`${day.rain_prob}% rain`} size="small" color={day.rain_prob > 50 ? "info" : "default"} variant="outlined" />
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  );
};

export default WeatherCard;
