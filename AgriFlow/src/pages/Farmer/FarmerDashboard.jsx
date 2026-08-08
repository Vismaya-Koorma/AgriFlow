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

import { useNavigate } from 'react-router-dom';
import { getFarms, getFields, getIrrigationHistory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
                System Status: Optimal
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
                Manage your farms intelligently with AI-driven insights. Your fields are currently receiving optimal hydration based on satellite moisture analysis.
              </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/farmer/farms')}
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
                  Add Farm
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/farmer/fields')}
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
                  Add Field
                </Button>
              </Box>
            </Grid>

            {/* Right Image Container using 2nd Image */}
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

          {/* Card 3: Gallons Flowed */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#fdf2f8', color: '#ec4899' }}>
                  <WaterDropIcon />
                </Box>
                <Chip label="Live Flowing" size="small" sx={{ bgcolor: '#fdf2f8', color: '#ec4899', fontWeight: 600, fontSize: '0.75rem' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                {loading ? '...' : formatGallons(stats.gallons24h)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Gallons Flowed (24h)
              </Typography>
            </Card>
          </Grid>

          {/* Card 4: Local Temperature */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#fff7ed', color: '#f97316' }}>
                  <WbSunnyIcon />
                </Box>
                <Chip label="Fair Skies" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 600, fontSize: '0.75rem' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                74°F
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Local Temperature
              </Typography>
            </Card>
          </Grid>
        </Grid>


        {/* ── 3. MIDDLE SECTION: RECENT ACTIVITY & QUICK ACTIONS ──────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  Recent Activity
                </Typography>
                <Button size="small" sx={{ color: '#2e7d32', fontWeight: 700, textTransform: 'none' }}>
                  View All
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
                    onClick={() => navigate('/farmer/farms')}
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ffffff', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <AddIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Add Farm
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/fields')}
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ffffff', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <GrassIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Add Field
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/irrigation-history')}
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ffffff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <DescriptionIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Records
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate('/farmer/profile')}
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      bgcolor: '#f4f8f3',
                      border: '1px solid #e3ede1',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', bgcolor: '#eaf3e7' }
                    }}
                  >
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ffffff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <PersonIcon />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Profile
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>


        {/* ── 4. ANALYTICS ROW: FARM PRODUCTIVITY & FIELD HEALTH ──────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Farm Productivity Chart */}
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    Farm Productivity
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Yield per quarter (tons across all locations)
                  </Typography>
                </Box>

                <FormControl size="small">
                  <Select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    sx={{ borderRadius: '12px', fontSize: '0.85rem', bgcolor: '#f8faf6' }}
                  >
                    <MenuItem value="2026">2026</MenuItem>
                    <MenuItem value="2025">2025</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Bar Chart Mock Visual */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, pt: 3, pb: 1, px: 2 }}>
                {[
                  { label: 'Q1', height: '40%' },
                  { label: 'Q2', height: '85%' },
                  { label: 'Q3', height: '60%' },
                  { label: 'Q4', height: '30%' },
                  { label: 'Q1 (Est)', height: '70%' },
                ].map((bar, idx) => (
                  <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '12%' }}>
                    <Box
                      sx={{
                        width: '100%',
                        height: bar.height,
                        bgcolor: idx === 1 ? '#2e7d32' : '#cbe3c5',
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.3s',
                        '&:hover': { bgcolor: '#2e7d32' }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      {bar.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Field Health Donut */}
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2 }}>
                Field Health
              </Typography>

              {/* Donut representation */}
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: `conic-gradient(#16a34a 0% ${fieldHealthPct}%, #eab308 ${fieldHealthPct}% ${Math.min(fieldHealthPct + 12, 99)}%, #dc2626 ${Math.min(fieldHealthPct + 12, 99)}% 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                  }}
                >
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      bgcolor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                      {fieldHealthPct}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                      Overall Healthy
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Prime</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#eab308' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Moderate</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#dc2626' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Critical</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>


        {/* ── 5. LOCAL CONDITIONS BANNER ───────────────────────────────── */}
        <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#e8efe6', border: '1px solid #d3e2cf', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e3a17' }}>
              Local Conditions
            </Typography>
            <Chip
              icon={<LocationOnIcon sx={{ fontSize: '1rem !important', color: '#2e7d32 !important' }} />}
              label={locationLabel}
              sx={{ bgcolor: '#ffffff', color: '#1e3a17', fontWeight: 700, borderRadius: '16px' }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ThermostatIcon sx={{ color: '#ef4444' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Temp</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>
                    74°F / 23°C
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', gap: 2 }}>
                <WaterDropIcon sx={{ color: '#0284c7' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Humidity</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>
                    42%
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', gap: 2 }}>
                <GrainIcon sx={{ color: '#2563eb' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Rainfall</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>
                    0.05 in
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', gap: 2 }}>
                <AirIcon sx={{ color: '#10b981' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Wind Speed</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>
                    12 mph NW
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Card>


        {/* ── 6. CROP HEALTH INDEX TABLE ───────────────────────────────── */}
        <Card elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Crop Health Index
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`${cropHealthList.filter((r) => r.ndvi >= 0.8).length} Healthy`} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
              <Chip label={`${cropHealthList.filter((r) => r.ndvi >= 0.6 && r.ndvi < 0.8).length} Monitor`} size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
              <Chip label={`${cropHealthList.filter((r) => r.ndvi < 0.6).length} High Risk`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }} />
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8faf6' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Crop Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Latest NDVI</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Growth Stage</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Est. Harvest</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cropHealthList.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748b' }}>
                      No fields added yet. Add a field to see crop health data.
                    </TableCell>
                  </TableRow>
                )}
                {cropHealthList.map((row, idx) => (
                  <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {row.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.zone}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={row.ndvi * 100}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': { bgcolor: row.ndvi > 0.8 ? '#16a34a' : '#d97706', borderRadius: 4 }
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                          {row.ndvi}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.stage}
                        size="small"
                        sx={{ bgcolor: row.stageColor, color: row.stageTextColor, fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                        {row.harvest}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate('/farmer/fields')}>
                        <ChevronRightIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

      </Box>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
