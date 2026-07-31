import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { waterAllocation, analytics } from '../../data/analytics';

const COLORS = ['#00695C', '#1565C0', '#E65100', '#2E7D32'];
const STATUS_COLOR = { Approved: 'success', Pending: 'warning', Rejected: 'error' };

const WaterManagerDashboard = () => {
  const [allocations, setAllocations] = useState(waterAllocation);

  const approve = (id) =>
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved', allocated: a.waterNeeded } : a));
  const reject = (id) =>
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected', allocated: '-' } : a));

  return (
    <DashboardLayout title="Water Resource Manager">
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Water Demand', value: '1.75 ML', icon: <WaterDropIcon />, color: '#1565C0' },
          { title: 'Available Water', value: '1.20 ML', icon: <CheckCircleIcon />, color: '#2E7D32' },
          { title: 'Pending Requests', value: '3', icon: <HourglassEmptyIcon />, color: '#E65100' },
          { title: 'Shortage Alerts', value: '2', icon: <WarningIcon />, color: '#B71C1C' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Monthly Consumption Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Monthly Water Consumption (Litres)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.waterConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="volume" fill="#00695C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Priority Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics.priorityDist} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {analytics.priorityDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Water Allocation Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Water Allocation Requests
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Farmer', 'Field', 'Water Needed', 'Priority', 'Status', 'Allocated', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{a.farmer}</TableCell>
                      <TableCell>{a.field}</TableCell>
                      <TableCell>{a.waterNeeded}</TableCell>
                      <TableCell><Chip label={a.priority} size="small" /></TableCell>
                      <TableCell><Chip label={a.status} color={STATUS_COLOR[a.status] || 'default'} size="small" /></TableCell>
                      <TableCell>{a.allocated}</TableCell>
                      <TableCell>
                        {a.status === 'Pending' && (
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="contained" color="success" onClick={() => approve(a.id)}
                              sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}>Approve</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => reject(a.id)}
                              sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}>Reject</Button>
                          </Stack>
                        )}
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

export default WaterManagerDashboard;
