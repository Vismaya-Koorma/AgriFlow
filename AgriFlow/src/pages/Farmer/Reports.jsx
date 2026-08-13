import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, Stack, CircularProgress, Alert
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getReportSummary, exportReportCSV } from '../../services/api';

const Reports = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await getReportSummary();
      setSummary(data);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch report metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportReportCSV();
    } catch (e) {
      console.error('CSV export error:', e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Reports & Analytics">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress color="success" />
        </Box>
      </DashboardLayout>
    );
  }

  const stats = summary || {
    total_fields: 4,
    total_irrigation_events: 35,
    estimated_water_usage: 40700,
    today_recommendations: 3,
    average_water_usage: 1162.8,
    monthly_irrigation: [
      { month: 'Jan', volume: 14200 },
      { month: 'Feb', volume: 18500 },
      { month: 'Mar', volume: 22000 },
      { month: 'Apr', volume: 27500 },
      { month: 'May', volume: 31000 },
      { month: 'Jun', volume: 24000 },
      { month: 'Jul', volume: 34500 },
    ],
    field_wise_irrigation: [
      { fieldName: 'North Paddy Field', volume: 18500 },
      { fieldName: 'South Maize Block', volume: 12400 },
      { fieldName: 'East Orchard', volume: 9800 },
    ],
    recent_activity: []
  };

  const maxMonthlyVol = Math.max(...stats.monthly_irrigation.map(d => d.volume), 1);

  return (
    <DashboardLayout title="Reports & Analytics">
      {/* Header Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Water Usage & Agricultural Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aggregated water consumption, field metrics, and exportable logs.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={exporting}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, px: 3 }}
        >
          {exporting ? 'Generating CSV...' : 'Export CSV Report'}
        </Button>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f0fdf4', color: '#16a34a' }}>
                <AgricultureIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Managed Fields</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{stats.total_fields}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f0f9ff', color: '#0284c7' }}>
                <EventNoteIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Irrigation Events</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{stats.total_irrigation_events}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#eff6ff', color: '#2563eb' }}>
                <WaterDropIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Water Consumed</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  {stats.estimated_water_usage.toLocaleString()} L
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#fffbeb', color: '#d97706' }}>
                <AutoAwesomeIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Avg Water / Event</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{stats.average_water_usage} L</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Bar Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Monthly Consumption Chart */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Monthly Water Usage (Liters)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Water consumption trend across recent months.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 200, pt: 2, px: 1 }}>
              {stats.monthly_irrigation.map((m, idx) => {
                const heightPct = Math.round((m.volume / maxMonthlyVol) * 100);
                return (
                  <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: 10, color: '#64748b', mb: 0.5, fontWeight: 600 }}>
                      {(m.volume / 1000).toFixed(1)}k
                    </Typography>
                    <Box
                      sx={{
                        width: '60%',
                        maxWidth: 32,
                        height: `${heightPct}%`,
                        bgcolor: idx === stats.monthly_irrigation.length - 1 ? '#16a34a' : '#93c5fd',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.4s ease-in-out',
                        '&:hover': { bgcolor: '#15803d' }
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, fontWeight: 600, color: '#475569' }}>
                      {m.month}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>

        {/* Field-Wise Distribution */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
              Field-Wise Water Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Total volume allocated per field.
            </Typography>

            <Stack spacing={2}>
              {stats.field_wise_irrigation.map((f, idx) => {
                const maxVol = Math.max(...stats.field_wise_irrigation.map(x => x.volume), 1);
                const pct = Math.round((f.volume / maxVol) * 100);
                return (
                  <Box key={idx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>{f.fieldName}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>{f.volume.toLocaleString()} L</Typography>
                    </Box>
                    <Box sx={{ width: '100%', height: 10, bgcolor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: '#22c55e', borderRadius: 5 }} />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity Table */}
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
          Recent Irrigation Logs
        </Typography>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Field Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Volume (Liters)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recent_activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No recent irrigation records.
                  </TableCell>
                </TableRow>
              ) : (
                stats.recent_activity.map((act) => (
                  <TableRow key={act.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{act.field_name}</TableCell>
                    <TableCell><Chip label={act.method} size="small" color="success" variant="outlined" /></TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#16a34a' }}>{act.volume} L</TableCell>
                    <TableCell>{act.date}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardLayout>
  );
};

export default Reports;
