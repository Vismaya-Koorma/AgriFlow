import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, CircularProgress, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails, Button, Alert, IconButton
} from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import AirIcon from '@mui/icons-material/Air';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import RefreshIcon from '@mui/icons-material/Refresh';

import { getCurrentWeather, getWeatherForecast } from '../../services/api';

const WeatherCard = ({ fieldId = null, farmId = null, onRefresh = null, refreshTrigger = 0 }) => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeatherData();
  }, [fieldId, farmId, refreshTrigger]);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [curr, fc] = await Promise.all([
        getCurrentWeather({ fieldId, farmId }),
        getWeatherForecast({ fieldId, farmId }),
      ]);
      setCurrentWeather(curr);
      setForecast(fc.forecast || fc || []);
      // Pass the fetched weather object to parent for the stat card
      if (onRefresh && curr) onRefresh(curr);
    } catch (e) {
      console.error('Error fetching live weather:', e);
      setError('Failed to load live weather data from Open-Meteo. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 220 }}>
        <CircularProgress color="success" size={36} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          Fetching Live Weather from Open-Meteo API...
        </Typography>
      </Card>
    );
  }

  if (error && !currentWeather) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fee2e2', bgcolor: '#fff5f5' }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchWeatherData} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Card>
    );
  }

  if (currentWeather && currentWeather.has_location === false) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WbSunnyIcon sx={{ color: '#d97706', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>
              Weather Forecast
            </Typography>
          </Box>
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchWeatherData} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
        </Box>
        <Alert severity="warning" sx={{ fontWeight: 500 }}>
          Please add the field location to view weather.
        </Alert>
      </Card>
    );
  }

  const weather = currentWeather || {};
  const temperature = weather.temperature ?? '--';
  const humidity = weather.humidity ?? '--';
  const rainProb = weather.rain_probability ?? weather.rain_prob ?? '--';
  const windSpeed = weather.wind_speed ?? '--';
  const cityName = weather.city || weather.field_name || 'Selected Field Location';
  const weatherCondition = weather.condition || 'Clear';
  const safeForecast = Array.isArray(forecast) ? forecast : [];

  return (
    <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WbSunnyIcon sx={{ color: '#eab308', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534' }}>
              Weather Forecast
            </Typography>
          </Box>
          <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600, mt: 0.5, ml: 4.5 }}>
            {cityName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={weatherCondition} color="success" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchWeatherData}
            sx={{ textTransform: 'none', color: '#166534', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Primary Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <ThermostatIcon sx={{ color: '#ef4444', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Temperature</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{temperature}°C</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <OpacityIcon sx={{ color: '#0284c7', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Humidity</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{humidity}%</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <ThunderstormIcon sx={{ color: '#2563eb', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Rain Chance</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{rainProb}%</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #dcfce7', textAlign: 'center' }}>
            <AirIcon sx={{ color: '#059669', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">Wind Speed</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>{windSpeed} km/h</Typography>
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
            {safeForecast.map((day, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: idx !== safeForecast.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, width: 90 }}>{day?.day || day?.date || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">{day?.condition || 'Clear'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{day?.temp_max ?? '--'}° / {day?.temp_min ?? '--'}°C</Typography>
                <Chip label={`${day?.rain_prob ?? day?.rain_probability ?? 0}% rain`} size="small" color={(day?.rain_prob || day?.rain_probability || 0) > 50 ? "info" : "default"} variant="outlined" />
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  );
};

export default WeatherCard;
