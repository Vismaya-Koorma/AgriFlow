import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, LinearProgress, IconButton, MenuItem, Select, FormControl
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import GrassIcon from '@mui/icons-material/Grass';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import GrainIcon from '@mui/icons-material/Grain';
import AirIcon from '@mui/icons-material/Air';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloudRainIcon from '@mui/icons-material/Thunderstorm';

import { useNavigate } from 'react-router-dom';
import { getFarms, getFields, getIrrigationHistory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import WeatherCard from '../../components/cards/WeatherCard';
import RecommendationCard from '../../components/cards/RecommendationCard';

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({ farms: 0, fields: 0, activeFields: 0, gallons24h: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [cropHealthList, setCropHealthList] = useState([]);
  const [fieldHealthPct, setFieldHealthPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('2026');

  const locationLabel = [user?.district, user?.state].filter(Boolean).join(', ') || 'Kerala, India';

  const formatGallons = (litres) => {
    const gallons = litres / 3.78541;
    if (gallons >= 1000) return `${(gallons / 1000).toFixed(1)}k`;
    return Math.round(gallons).toString();
  };

  const stageStyles = {
    germination: { stage: 'SEEDING', stageColor: '#e0f2fe', stageTextColor: '#0369a1' },
    vegetative: { stage: 'VEGETATIVE', stageColor: '#fef3c7', stageTextColor: '#b45309' },
    flowering: { stage: 'FLOWERING', stageColor: '#dcfce7', stageTextColor: '#15803d' },
    fruiting: { stage: 'FRUITING', stageColor: '#ede9fe', stageTextColor: '#6d28d9' },
    harvesting: { stage: 'HARVESTING', stageColor: '#ffedd5', stageTextColor: '#c2410c' },
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [farmsData, fieldsData, historyData] = await Promise.all([
          getFarms(), getFields(), getIrrigationHistory()
        ]);

        const farmsList = Array.isArray(farmsData) ? farmsData : (farmsData?.results || []);
        const fieldsList = Array.isArray(fieldsData) ? fieldsData : (fieldsData?.results || []);
        const historyList = Array.isArray(historyData) ? historyData : (historyData?.results || []);

        const activeFields = fieldsList.filter((f) => f.status).length;
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const litres24h = historyList
          .filter((h) => new Date(h.irrigated_at).getTime() >= dayAgo)
          .reduce((sum, h) => sum + Number(h.volume_litres || 0), 0);

        setStats({
          farms: farmsList.length,
          fields: fieldsList.length,
          activeFields,
          gallons24h: litres24h,
        });

        const healthyPct = fieldsList.length
          ? Math.round((activeFields / fieldsList.length) * 100)
          : 0;
        setFieldHealthPct(healthyPct);

        const activities = [];

        historyList.slice(0, 3).forEach((h) => {
          activities.push({
            id: `irr-${h.id}`,
            type: 'success',
            title: `Field Irrigated: ${h.field_name || 'Field #' + h.field}`,
            sub: `${new Date(h.irrigated_at).toLocaleString()} • ${h.volume_litres}L via ${h.method || 'drip'}`,
          });
        });

        farmsList.slice(0, 2).forEach((farm) => {
          activities.push({
            id: `farm-${farm.id}`,
            type: 'info',
            title: `Farm: ${farm.name}`,
            sub: `${new Date(farm.created_at).toLocaleDateString()} • ${farm.location || farm.district || 'Location set'}`,
          });
        });

        setRecentActivities(activities.slice(0, 5));

        const cropRows = fieldsList.slice(0, 5).map((field) => {
          const style = stageStyles[field.crop_stage] || stageStyles.germination;
          const ndvi = field.status ? 0.85 : 0.62;
          return {
            type: field.crop_type_name || field.name,
            zone: `${field.farm_name || 'Farm'} • ${field.area} Acres`,
            ndvi,
            ...style,
            harvest: field.planting_date
              ? new Date(new Date(field.planting_date).setMonth(new Date(field.planting_date).getMonth() + 4)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '—',
          };
        });
        setCropHealthList(cropRows);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout title="Farmer Dashboard">
      <Box sx={{ pb: 6, bgcolor: '#f3f6f1', minHeight: '100vh', mx: -3, my: -3, p: 3 }}>

        {/* ── 1. HERO BANNER CARD ───────────────────────────────────────── */}
        <Card
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '24px',
            mb: 3,
            bgcolor: '#e6efe2',
            border: '1px solid #d4e3ce',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              {/* Status Badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.6,
                  borderRadius: '20px',
                  bgcolor: '#d5e6cf',
                  color: '#23521b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  mb: 2
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                AgriFlow Engine: Online & Recommendation Active
              </Box>

              {/* Title */}
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1a3814', mb: 1.5, fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
                Welcome back,<br />
                <span style={{ fontStyle: 'italic', color: '#2e6b23' }}>
                  {user?.full_name || user?.username || 'Farmer'}!
                </span>
              </Typography>

              {/* Subtitle */}
              <Typography variant="body1" sx={{ color: '#496044', mb: 3, maxWidth: '540px', lineHeight: 1.6 }}>
                Manage your farms intelligently with AI-driven insights, live weather forecasts, and automated rule-based irrigation guidance.
              </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/farmer/irrigation-history')}
                  sx={{
                    bgcolor: '#1c4516',
                    '&:hover': { bgcolor: '#143310' },
                    color: '#ffffff',
                    px: 3,
                    py: 1.2,
                    borderRadius: '24px',
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(28,69,22,0.2)'
                  }}
                >
                  Log Irrigation
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CloudRainIcon />}
                  onClick={() => navigate('/farmer/irrigation-history')}
                  sx={{
                    bgcolor: '#ffffff',
                    '&:hover': { bgcolor: '#f7faf5' },
                    color: '#1c4516',
                    px: 3,
                    py: 1.2,
                    borderRadius: '24px',
                    fontWeight: 700,
                    textTransform: 'none',
                    border: '1px solid #c2d6bc'
                  }}
                >
                  Confirm Rainfall
                </Button>
              </Box>
            </Grid>

            {/* Right Image Container */}
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: '100%',
                  maxHeight: '260px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                  border: '3px solid #ffffff',
                  position: 'relative'
                }}
              >
                <Box
                  component="img"
                  src="/irrigation-hero.jpg"
                  alt="Irrigation system in field"
                  sx={{
                    width: '100%',
                    height: '260px',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'scale(1.03)' }
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Card>

        {/* ── 2. TOP STAT CARDS ───────────────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {/* Card 1: Total Farms Managed */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#edf7eb', color: '#2e7d32' }}>
                  <AgricultureIcon />
                </Box>
                {stats.farms > 0 && (
                  <Chip label={`${stats.farms} total`} size="small" sx={{ bgcolor: '#edf7eb', color: '#2e7d32', fontWeight: 600, fontSize: '0.75rem' }} />
                )}
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                {loading ? '...' : stats.farms}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Total Farms Managed
              </Typography>
            </Card>
          </Grid>

          {/* Card 2: Active Fields */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#eef2ff', color: '#3b82f6' }}>
                  <GrassIcon />
                </Box>
                <Chip
                  label={stats.fields ? `${Math.round((stats.activeFields / stats.fields) * 100)}% active` : '0% active'}
                  size="small"
                  sx={{ bgcolor: '#eef2ff', color: '#3b82f6', fontWeight: 600, fontSize: '0.75rem' }}
                />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                {loading ? '...' : stats.activeFields}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Active Fields
              </Typography>
            </Card>
          </Grid>

          {/* Card 3: Water Flowed */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#fdf2f8', color: '#ec4899' }}>
                  <WaterDropIcon />
                </Box>
                <Chip label="Live Flowing" size="small" sx={{ bgcolor: '#fdf2f8', color: '#ec4899', fontWeight: 600, fontSize: '0.75rem' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                {loading ? '...' : `${stats.gallons24h} L`}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Water Consumed (24h)
              </Typography>
            </Card>
          </Grid>

          {/* Card 4: Weather Overview */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#fff7ed', color: '#f97316' }}>
                  <WbSunnyIcon />
                </Box>
                <Chip label="Partly Cloudy" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 600, fontSize: '0.75rem' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                29.5°C
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Local Temp ({user?.district || 'Alappuzha'})
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* ── 3. PHASE 1 INTEGRATION: RECOMMENDATION ENGINE & WEATHER CARD ──────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <RecommendationCard />
          </Grid>
          <Grid item xs={12} md={6}>
            <WeatherCard />
          </Grid>
        </Grid>

        {/* ── 4. MIDDLE SECTION: RECENT ACTIVITY & QUICK ACTIONS ──────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  Recent Activity
                </Typography>
                <Button size="small" onClick={() => navigate('/farmer/irrigation-history')} sx={{ color: '#2e7d32', fontWeight: 700, textTransform: 'none' }}>
                  View All Logs
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivities.length === 0 && !loading && (
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 3 }}>
                    No recent activity yet. Add a farm or irrigation record to get started.
                  </Typography>
                )}
                {recentActivities.map((act) => (
                  <Box
                    key={act.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: 2,
                      p: 1.8,
                      borderRadius: '14px',
                      bgcolor: '#f8faf6',
                      border: '1px solid #edf2eb'
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: act.type === 'warning' ? '#fee2e2' : act.type === 'info' ? '#dbeafe' : '#dcfce7',
                        color: act.type === 'warning' ? '#dc2626' : act.type === 'info' ? '#2563eb' : '#16a34a',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}
                    >
                      {act.type === 'warning' ? '!' : '✓'}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {act.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                        {act.sub}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2.5 }}>
                Quick Actions
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/irrigation-history')}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#ffffff', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <WaterDropIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                      Irrigation Logs
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/irrigation-history')}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#ffffff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <CloudRainIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                      Log Rainfall
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/reports')}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#ffffff', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <AssessmentIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                      Reports
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/alerts')}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#ffffff', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <NotificationsIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                      System Alerts
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
