import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Chip, CircularProgress, Alert, Divider, Grid,
  LinearProgress, Tooltip, Stack
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

  const priorityConfig = {
    LOW: { label: 'LOW PRIORITY', color: '#16a34a', bg: '#dcfce7' },
    MEDIUM: { label: 'MEDIUM PRIORITY', color: '#d97706', bg: '#fef3c7' },
    HIGH: { label: 'HIGH PRIORITY', color: '#dc2626', bg: '#fee2e2' },
  };

  const priorityInfo = priorityConfig[data?.priority] || (data?.irrigation_needed ? priorityConfig.MEDIUM : priorityConfig.LOW);
  const stress = stressConfig[data?.crop_stress] || stressConfig.Low;
  const confidenceVal = Number(data?.confidence ?? 85);

  return (
    <Card elevation={0} sx={{
      p: 3, borderRadius: '16px',
      border: '1px solid',
      borderColor: data?.irrigation_needed ? '#c7d2fe' : '#d1fae5',
      background: data?.irrigation_needed
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
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={priorityInfo.label}
            size="small"
            sx={{ bgcolor: priorityInfo.bg, color: priorityInfo.color, fontWeight: 800, fontSize: '0.72rem', border: `1px solid ${priorityInfo.color}33` }}
          />
          <Chip
            label={`${confidenceVal}% Confidence`}
            size="small"
            sx={{ bgcolor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}
          />
        </Stack>
      </Box>

      {/* Location label */}
      {data.field_name && (
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 2, display: 'block' }}>
          📍 {data.field_name}{data.location ? ` — ${data.location}` : ''} ({data.crop_name || 'Crop'} • {data.crop_stage || 'Growth Stage'})
        </Typography>
      )}

      {/* Recommendation Banner */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '14px',
        bgcolor: data.irrigation_needed ? '#4f46e5' : '#16a34a', mb: 2.5, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {data.irrigation_needed
            ? <WaterDropIcon sx={{ color: '#fff', fontSize: 32 }} />
            : <CheckCircleIcon sx={{ color: '#fff', fontSize: 32 }} />
          }
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recommendation
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {data.irrigation_needed ? '💧 Irrigation Needed' : '❌ No Irrigation Needed'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', bgcolor: 'rgba(255,255,255,0.15)', px: 2, py: 1, borderRadius: '10px' }}>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.7rem' }}>Recommended Water</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            {data.recommended_water > 0 ? `${data.recommended_water.toLocaleString()} Liters` : '0 Liters'}
          </Typography>
        </Box>
      </Box>

      {/* Dynamic Water Deficit Breakdown Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Crop Demand */}
        <Grid item xs={6} sm={4}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Crop Water Demand</Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">
              {data.today_crop_demand_liters ? `${Number(data.today_crop_demand_liters).toLocaleString()} L/day` : 'N/A'}
            </Typography>
          </Box>
        </Grid>

        {/* Previous Irrigation */}
        <Grid item xs={6} sm={4}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Previous Irrigation</Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#475569">
              {(data.yesterday_irrigation_liters != null) ? `${Number(data.yesterday_irrigation_liters).toLocaleString()} L` : '0 L'}
            </Typography>
          </Box>
        </Grid>

        {/* Effective Rainfall */}
        <Grid item xs={6} sm={4}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Effective Rainfall</Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#15803d">
              {(data.effective_rainfall_liters != null) ? `${Number(data.effective_rainfall_liters).toLocaleString()} L` : '0 L'}
            </Typography>
          </Box>
        </Grid>

        {/* Water Deficit */}
        <Grid item xs={6} sm={4}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Water Deficit</Typography>
            <Typography variant="subtitle2" fontWeight={800} color={(data.net_water_deficit_liters || 0) > 0 ? "#b91c1c" : "#15803d"}>
              {(data.net_water_deficit_liters != null) ? `${Number(data.net_water_deficit_liters).toLocaleString()} L` : '0 L'}
            </Typography>
          </Box>
        </Grid>

        {/* Temperature & Humidity */}
        {data.weather && (
          <Grid item xs={6} sm={4}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Weather</Typography>
              <Typography variant="subtitle2" fontWeight={800} color="#334155">
                {data.weather.temperature}°C • {data.weather.humidity}% RH
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Crop Stress */}
        <Grid item xs={6} sm={4}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Crop Stress</Typography>
            <Chip
              label={`${stress.icon} ${data.crop_stress}`}
              size="small"
              sx={{ bgcolor: stress.bg, color: stress.color, fontWeight: 700, height: 22, fontSize: '0.7rem' }}
            />
          </Box>
        </Grid>
      </Grid>

      {/* AI Confidence progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>AI Confidence (Data Quality)</Typography>
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
      <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 14 }} />
          <Typography variant="caption" fontWeight={700} color="#4338ca">AI Explanation</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.82rem' }}>
          "{data.reason}"
        </Typography>
      </Box>
    </Card>
  );
};

export default AIRecommendationCard;
