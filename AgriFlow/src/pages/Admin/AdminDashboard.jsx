import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Avatar,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import PeopleIcon from '@mui/icons-material/People';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import DevicesIcon from '@mui/icons-material/Devices';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { users } from '../../data/users';
import { analytics } from '../../data/analytics';
import { farms } from '../../data/farms';

const ROLE_COLOR = { farmer: '#2E7D32', supervisor: '#1565C0', manager: '#00695C', maintenance: '#E65100', admin: '#6A1B9A' };

const AdminDashboard = () => {
  const [userList, setUserList] = useState(users);

  const deleteUser = (id) => setUserList(prev => prev.filter(u => u.id !== id));

  return (
    <DashboardLayout title="System Administrator">
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Users', value: String(userList.length), icon: <PeopleIcon />, color: '#6A1B9A' },
          { title: 'Registered Farms', value: String(farms.length), icon: <AgricultureIcon />, color: '#2E7D32' },
          { title: 'System Health', value: '99.2%', icon: <MonitorHeartIcon />, color: '#00695C' },
          { title: 'Active Sessions', value: '3', icon: <DevicesIcon />, color: '#1565C0' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* User Growth Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              User Growth
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#6A1B9A" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* System Role Summary */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Users by Role
            </Typography>
            {Object.entries(
              userList.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
            ).map(([role, count]) => (
              <Stack key={role} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ROLE_COLOR[role] }} />
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{role}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{count}</Typography>
              </Stack>
            ))}
          </Card>
        </Grid>

        {/* Users Management Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                User Management
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} size="small" sx={{ borderRadius: '8px' }}>
                Add User
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['User', 'Username', 'Role', 'District', 'Email', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userList.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ bgcolor: ROLE_COLOR[u.role], width: 30, height: 30, fontSize: '0.8rem' }}>
                            {u.name[0]}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{u.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>
                        <Chip label={u.role} size="small" sx={{ bgcolor: `${ROLE_COLOR[u.role]}15`, color: ROLE_COLOR[u.role], fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>{u.district}</TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip label={u.status} color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
                            sx={{ borderRadius: '6px', fontSize: '0.72rem', py: 0.3 }}>Edit</Button>
                          <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />}
                            onClick={() => deleteUser(u.id)}
                            sx={{ borderRadius: '6px', fontSize: '0.72rem', py: 0.3 }}>Delete</Button>
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

export default AdminDashboard;
