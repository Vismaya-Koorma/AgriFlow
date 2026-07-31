import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VerifiedIcon from '@mui/icons-material/Verified';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { fields } from '../../data/farms';
import { analytics } from '../../data/analytics';

const COLORS = ['#2E7D32', '#FF9800', '#F44336'];

const SupervisorDashboard = () => {
  const [fieldList, setFieldList] = useState(fields);

  const verify = (id) => setFieldList(prev =>
    prev.map(f => f.id === id ? { ...f, verified: true } : f)
  );

  return (
    <DashboardLayout title="Field Supervisor Dashboard">
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Assigned Farmers', value: '12', icon: <PeopleIcon />, color: '#1565C0' },
          { title: 'Pending Verification', value: '3', icon: <HourglassEmptyIcon />, color: '#E65100' },
          { title: 'Approved Fields', value: '18', icon: <VerifiedIcon />, color: '#2E7D32' },
          { title: "Today's Alerts", value: '4', icon: <NotificationsActiveIcon />, color: '#B71C1C' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Verification Progress Donut */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Verification Progress
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics.verificationProgress} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {analytics.verificationProgress.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Crop Health Bar Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Weekly Water Usage Overview
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.weeklyWaterUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="usage" fill="#1565C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Field Verification Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Field Verification List
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Field', 'Crop', 'Soil', 'Stage', 'Status', 'Verified', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fieldList.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{f.fieldName}</TableCell>
                      <TableCell>{f.crop}</TableCell>
                      <TableCell>{f.soilType}</TableCell>
                      <TableCell>{f.cropStage}</TableCell>
                      <TableCell><Chip label={f.status} size="small" /></TableCell>
                      <TableCell>
                        <Chip label={f.verified ? 'Yes' : 'Pending'} color={f.verified ? 'success' : 'warning'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {!f.verified && (
                            <Button size="small" variant="contained" color="success" onClick={() => verify(f.id)}
                              sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}>
                              Verify
                            </Button>
                          )}
                          <Button size="small" variant="outlined" color="error"
                            sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}>
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
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

export default SupervisorDashboard;
