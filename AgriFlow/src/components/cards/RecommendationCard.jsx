import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Button, Chip, Stack, CircularProgress, Alert } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import WaterIcon from '@mui/icons-material/Water';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import InfoIcon from '@mui/icons-material/Info';
import { getLatestRecommendation } from '../../services/api';

const RecommendationCard = ({ fieldId = null }) => {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRec();
  }, [fieldId]);

  const fetchRec = async () => {
    setLoading(true);
    try {
      const data = await getLatestRecommendation(fieldId);
      setRec(data);
    } catch (e) {
      console.error('Error fetching recommendation:', e);
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

  const recommendation = rec || {
    status: 'postpone',
    recommendation_text: 'Postpone Irrigation',
    reason: '75% rain probability detected tomorrow. Recent rainfall logged: 5 mm.',
    water_volume_litres: 0,
    priority: 'high',
    field_name: 'North Paddy Field'
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'irrigate':
      case 'irrigate_now':
        return {
          color: '#15803d',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          icon: <WaterIcon sx={{ fontSize: 36, color: '#16a34a' }} />,
          chipColor: 'success'
        };
      case 'postpone':
      case 'postpone_irrigation':
        return {
          color: '#0369a1',
          bgColor: '#f0f9ff',
          borderColor: '#bae6fd',
          icon: <PauseCircleIcon sx={{ fontSize: 36, color: '#0284c7' }} />,
          chipColor: 'info'
        };
      default:
        return {
          color: '#b45309',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          icon: <CheckCircleIcon sx={{ fontSize: 36, color: '#d97706' }} />,
          chipColor: 'warning'
        };
    }
  };

  const config = getStatusConfig(recommendation.status);

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
        <Stack direction="row" spacing={1}>
          <Chip label={`Priority: ${recommendation.priority.toUpperCase()}`} color={recommendation.priority === 'high' ? 'error' : 'default'} size="small" sx={{ fontWeight: 700 }} />
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchRec} sx={{ textTransform: 'none', color: '#475569' }}>
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Advice Body */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        {config.icon}
        <Box flexGrow={1}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: config.color, mb: 0.5 }}>
            {recommendation.recommendation_text}
          </Typography>
          <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
            {recommendation.reason}
          </Typography>
        </Box>
      </Box>

      {/* Target Field & Volume details */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Target Field</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            {recommendation.field_name || 'All Active Fields'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">Suggested Volume</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803d' }}>
            {recommendation.water_volume_litres > 0 ? `${recommendation.water_volume_litres} Liters` : '0 Liters (No Action Needed)'}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default RecommendationCard;
