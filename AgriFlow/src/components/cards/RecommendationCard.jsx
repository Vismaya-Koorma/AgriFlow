import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Button, Chip, Stack, CircularProgress, Alert } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import WaterIcon from '@mui/icons-material/Water';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpacityIcon from '@mui/icons-material/Opacity';
import AirIcon from '@mui/icons-material/Air';

import { getLatestRecommendation } from '../../services/api';

const RecommendationCard = ({ fieldId = null, farmId = null, refreshTrigger = 0 }) => {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRec();
  }, [fieldId, farmId, refreshTrigger]);

  const fetchRec = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLatestRecommendation({ fieldId, farmId });
      setRec(data);
      setRec(data);
    } catch (e) {
      console.error('Error fetching recommendation:', e);
      setError('Unable to fetch live smart irrigation recommendation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 220 }}>
        <CircularProgress color="success" size={36} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          Calculating Live Irrigation Advice from Weather...
        </Typography>
      </Card>
    );
  }

  if (error && !rec) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fee2e2', bgcolor: '#fff5f5' }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchRec} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Card>
    );
  }

  // No location warning
  if (rec && rec.has_location === false) {
    return (
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#d97706', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>Smart Irrigation Advice</Typography>
          </Box>
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchRec} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
        </Box>
        <Alert severity="warning" sx={{ fontWeight: 500 }}>
          Please add the field location (District/State or Lat/Lon) to generate irrigation advice.
        </Alert>
      </Card>
    );
  }

  const recommendation = rec || {
    recommendation: 'Normal Irrigation Schedule',
    recommendation_text: 'Normal Irrigation Schedule',
    status: 'normal',
    priority: 'Medium',
    estimated_water_requirement: '30,000 Liters',
    water_volume_litres: 30000,
    reason: 'Optimal weather conditions. Maintain standard watering schedule.',
    field_name: 'Main Field'
  };


  const getStatusConfig = (status, text = '') => {
    const s = (status || '').toLowerCase();
    const t = (text || '').toLowerCase();

    if (s.includes('irrigate') || t.includes('irrigate today')) {
      return {
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        icon: <WaterIcon sx={{ fontSize: 40, color: '#16a34a' }} />,
        chipColor: 'error'
      };
    } else if (s.includes('postpone') || t.includes('postpone')) {
      return {
        color: '#0369a1',
        bgColor: '#f0f9ff',
        borderColor: '#bae6fd',
        icon: <PauseCircleIcon sx={{ fontSize: 40, color: '#0284c7' }} />,
        chipColor: 'info'
      };
    } else if (s.includes('reduce') || t.includes('reduce water')) {
      return {
        color: '#7c3aed',
        bgColor: '#f5f3ff',
        borderColor: '#ddd6fe',
        icon: <OpacityIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />,
        chipColor: 'warning'
      };
    } else if (s.includes('sprinkler') || t.includes('avoid sprinkler')) {
      return {
        color: '#c2410c',
        bgColor: '#fff7ed',
        borderColor: '#ffedd5',
        icon: <AirIcon sx={{ fontSize: 40, color: '#ea580c' }} />,
        chipColor: 'error'
      };
    }
    
    return {
      color: '#15803d',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#16a34a' }} />,
      chipColor: 'success'
    };
  };

  const config = getStatusConfig(recommendation.status, recommendation.recommendation);

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high' || p === 'critical') return 'error';
    if (p === 'medium') return 'warning';
    return 'info';
  };

  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '16px',
        border: `1px solid ${config.borderColor}`,
        bgcolor: config.bgColor,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon sx={{ color: '#15803d', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Smart Irrigation Advice
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Priority: ${(recommendation.priority || 'Medium').toUpperCase()}`}
            color={getPriorityColor(recommendation.priority)}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchRec}
            sx={{ textTransform: 'none', color: '#475569', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Advice Body */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
        {config.icon}
        <Box flexGrow={1}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: config.color, mb: 0.5 }}>
            {recommendation.recommendation || recommendation.recommendation_text}
          </Typography>
          <Typography variant="body1" sx={{ color: '#334155', fontWeight: 500, lineHeight: 1.5 }}>
            {recommendation.reason}
          </Typography>
        </Box>
      </Box>

      {/* Target Field & Volume details */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Target Field</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            {recommendation.field_name || 'All Active Fields'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" display="block">Estimated Water Requirement</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: config.color }}>
            {recommendation.estimated_water_requirement || (recommendation.water_volume_litres > 0 ? `${recommendation.water_volume_litres.toLocaleString()} Liters` : '0 Liters')}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default RecommendationCard;
