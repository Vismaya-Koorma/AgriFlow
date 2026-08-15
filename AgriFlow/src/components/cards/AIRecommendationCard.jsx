import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Chip, CircularProgress, Alert, Divider, Grid,
  LinearProgress, Tooltip
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import OpacityIcon from '@mui/icons-material/Opacity';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

import { getAIRecommendation } from '../../services/api';

const stressConfig = {
  Low: { label: 'Low Stress', color: '#16a34a', bg: '#dcfce7', icon: '🟢' },
  Medium: { label: 'Medium Stress', color: '#d97706', bg: '#fef3c7', icon: '🟠' },
  High: { label: 'High Stress', color: '#dc2626', bg: '#fee2e2', icon: '🔴' },
};

const AIRecommendationCard = ({ fieldId = null, farmId = null, refreshTrigger = 0 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRec();
  }, [fieldId, farmId, refreshTrigger]);

  const fetchRec = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAIRecommendation({ fieldId, farmId });
      setData(result);
    } catch (e) {
      console.error('AI recommendation error:', e);
      setError('Unable to load AI irrigation recommendation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 36 }} />
        <CircularProgress size={32} sx={{ color: '#6366f1' }} />
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Running AI Irrigation Model...
        </Typography>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Alert severity="error">{error}</Alert>
      </Card>
    );
  }

  if (!data) return null;

  // Handle error states from backend
  if (data.error === 'location_missing') {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#d97706' }} />
          <Typography variant="subtitle1" fontWeight={700} color="#92400e">AI Irrigation Recommendation</Typography>
        </Box>
        <Alert severity="warning">{data.message}</Alert>
      </Card>
    );
  }

  if (data.error === 'weather_unavailable') {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
        <Alert severity="warning">{data.message}</Alert>
      </Card>
    );
  }

  const stress = stressConfig[data.crop_stress] || stressConfig.Low;

  return (
    <Card elevation={0} sx={{
      p: 3, borderRadius: '16px',
      border: '1px solid',
      borderColor: data.irrigation_needed ? '#c7d2fe' : '#d1fae5',
      background: data.irrigation_needed
        ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#ede9fe', color: '#6366f1' }}>
            <AutoAwesomeIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle1" fontWeight={800} color="#1e1b4b">
            AI Irrigation Recommendation
          </Typography>
        </Box>
        <Chip
          label={`${data.confidence}% Confidence`}
          size="small"
          sx={{ bgcolor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}
        />
      </Box>

      {/* Location label */}
      {data.field_name && (
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 2, display: 'block' }}>
          📍 {data.field_name}{data.location ? ` — ${data.location}` : ''}
        </Typography>
      )}

      {/* Recommendation Banner */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '12px',
        bgcolor: data.irrigation_needed ? '#4f46e5' : '#16a34a', mb: 2
      }}>
        {data.irrigation_needed
          ? <CheckCircleIcon sx={{ color: '#fff', fontSize: 28 }} />
          : <CancelIcon sx={{ color: '#fff', fontSize: 28 }} />
        }
        <Box>
          <Typography variant="body2" sx={{ color: '#fff', opacity: 0.85, fontSize: '0.72rem' }}>Recommendation</Typography>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 800 }}>
            {data.irrigation_needed ? '✔ Irrigate Today' : '✖ No Irrigation Needed'}
          </Typography>
        </Box>
      </Box>

      {/* Key Metrics Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Water Requirement */}
        <Grid item xs={6}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <WaterDropIcon sx={{ color: '#0ea5e9', fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Estimated Water</Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} color="#0c4a6e">
              {data.recommended_water > 0 ? `${data.recommended_water}` : '—'}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {data.recommended_water > 0 ? data.unit : 'Not required'}
              </Typography>
            </Typography>
          </Box>
        </Grid>

        {/* Crop Stress */}
        <Grid item xs={6}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <WarningAmberIcon sx={{ color: stress.color, fontSize: 18 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Crop Stress</Typography>
            </Box>
            <Chip
              label={`${stress.icon} ${data.crop_stress}`}
              size="small"
              sx={{ bgcolor: stress.bg, color: stress.color, fontWeight: 700, border: `1px solid ${stress.color}33` }}
            />
          </Box>
        </Grid>

        {/* Temperature */}
        {data.weather && (
          <Grid item xs={6}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <ThermostatIcon sx={{ color: '#f97316', fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Temperature</Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={800} color="#7c2d12">{data.weather.temperature}°C</Typography>
            </Box>
          </Grid>
        )}

        {/* Humidity */}
        {data.weather && (
          <Grid item xs={6}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <OpacityIcon sx={{ color: '#0284c7', fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Humidity</Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0c4a6e">{data.weather.humidity}%</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* AI Confidence progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>AI Confidence</Typography>
          <Typography variant="caption" color="#6366f1" fontWeight={700}>{data.confidence}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={data.confidence}
          sx={{
            height: 8, borderRadius: 4,
            bgcolor: '#e0e7ff',
            '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 }
          }}
        />
      </Box>

      <Divider sx={{ mb: 1.5, borderColor: 'rgba(0,0,0,0.08)' }} />

      {/* AI Explanation */}
      <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: '10px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 14 }} />
          <Typography variant="caption" fontWeight={700} color="#4338ca">AI Explanation</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.8rem' }}>
          {data.reason}
        </Typography>
      </Box>
    </Card>
  );
};

export default AIRecommendationCard;
