import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Paper, Stack, Divider,
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import AirIcon from '@mui/icons-material/Air';
import GrainIcon from '@mui/icons-material/Grain';
import { fields, irrigationHistory } from '../../data/farms';
import { weather } from '../../data/weather';
import { analytics } from '../../data/analytics';

import { getDashboard } from '../../services/api';

const STATUS_COLOR = { Irrigate: 'error', Monitor: 'warning', Postpone: 'info' };

const FarmerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    getDashboard()
      .then((data) => setDashboardData(data))
      .catch(() => {
        // Fallback to static dummy data if backend is offline
      });
  }, []);

  const totalFarms = dashboardData?.stats?.total_farms ?? '3';
  const totalFields = dashboardData?.stats?.total_fields ?? '5';
  const activeAlerts = dashboardData?.stats?.active_alerts ?? '2';

  return (
    <DashboardLayout title="Farmer Dashboard">
      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Farms', value: String(totalFarms), icon: <AgricultureIcon />, color: '#2E7D32' },
          { title: 'Registered Fields', value: String(totalFields), icon: <CheckCircleIcon />, color: '#1565C0' },
          { title: 'Crop Stress Alerts', value: String(activeAlerts), icon: <WarningIcon />, color: '#E65100' },
          { title: 'Water Req. Today', value: '75,000 L', icon: <WaterDropIcon />, color: '#00695C' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Weather Widget */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Today's Weather
            </Typography>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <WbSunnyIcon sx={{ fontSize: 48, color: '#FFB300' }} />
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b' }}>
                {weather.today.temperature}°C
              </Typography>
              <Typography variant="body2" color="text.secondary">{weather.today.condition}</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {[
                { label: 'Humidity', value: `${weather.today.humidity}%`, icon: <OpacityIcon fontSize="small" /> },
                { label: 'Rain Probability', value: `${weather.today.rainProbability}%`, icon: <GrainIcon fontSize="small" /> },
                { label: 'Wind Speed', value: `${weather.today.windSpeed} km/h`, icon: <AirIcon fontSize="small" /> },
              ].map((item) => (
                <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#64748b' }}>
                    {item.icon}
                    <Typography variant="body2">{item.label}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{item.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>

        {/* Weekly Water Usage Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Weekly Water Usage (Litres)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.weeklyWaterUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="usage" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Field Recommendations Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Today's Field Recommendations
              </Typography>
              <Button variant="contained" size="small" sx={{ borderRadius: '8px' }}>+ Add Field</Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Field Name', 'Crop', 'Soil Type', 'Crop Stage', 'Status', 'Recommendation'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{f.fieldName}</TableCell>
                      <TableCell>{f.crop}</TableCell>
                      <TableCell>{f.soilType}</TableCell>
                      <TableCell>{f.cropStage}</TableCell>
                      <TableCell>
                        <Chip label={f.status} color={STATUS_COLOR[f.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{f.recommendation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Crop Stress Trend */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Crop Stress Trend
            </Typography>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={analytics.cropStressTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="stress" stroke="#E65100" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Irrigation History */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Recent Irrigation History
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Date', 'Amount', 'Method', 'Duration'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {irrigationHistory.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.date}</TableCell>
                      <TableCell>{h.amount}</TableCell>
                      <TableCell>{h.method}</TableCell>
                      <TableCell>{h.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
