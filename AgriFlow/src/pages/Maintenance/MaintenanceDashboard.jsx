import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, TextField,
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { complaints as initialComplaints } from '../../data/complaints';

const PRIORITY_COLOR = { Critical: 'error', High: 'error', Medium: 'warning', Low: 'default' };
const STATUS_COLOR = { Pending: 'default', Assigned: 'info', 'In Progress': 'warning', Resolved: 'success', Closed: 'success' };

const MaintenanceDashboard = () => {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [notes, setNotes] = useState({});

  const updateStatus = (id, newStatus) =>
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

  const counts = {
    Pending: complaints.filter(c => c.status === 'Pending').length,
    Assigned: complaints.filter(c => c.status === 'Assigned').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
    Closed: complaints.filter(c => c.status === 'Closed').length,
  };

  return (
    <DashboardLayout title="Maintenance Dashboard">
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Pending', value: String(counts.Pending), icon: <BuildIcon />, color: '#E65100' },
          { title: 'Assigned', value: String(counts.Assigned), icon: <AssignmentIcon />, color: '#1565C0' },
          { title: 'Resolved', value: String(counts.Resolved), icon: <CheckCircleIcon />, color: '#2E7D32' },
          { title: 'Closed', value: String(counts.Closed), icon: <LockIcon />, color: '#6A1B9A' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Complaints Table */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Complaint List
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                {['ID', 'Issue Type', 'Location', 'Priority', 'Reported', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {complaints.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.id}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{c.location}</TableCell>
                  <TableCell>
                    <Chip label={c.priority} color={PRIORITY_COLOR[c.priority] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>{c.reportedDate}</TableCell>
                  <TableCell>
                    <Chip label={c.status} color={STATUS_COLOR[c.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {c.status === 'Pending' && (
                        <Button size="small" variant="contained" onClick={() => updateStatus(c.id, 'In Progress')}
                          sx={{ borderRadius: '6px', fontSize: '0.72rem', py: 0.3 }}>Start</Button>
                      )}
                      {c.status === 'In Progress' && (
                        <Button size="small" variant="contained" color="success" onClick={() => updateStatus(c.id, 'Resolved')}
                          sx={{ borderRadius: '6px', fontSize: '0.72rem', py: 0.3 }}>Complete</Button>
                      )}
                      {c.status === 'Resolved' && (
                        <Button size="small" variant="outlined" onClick={() => updateStatus(c.id, 'Closed')}
                          sx={{ borderRadius: '6px', fontSize: '0.72rem', py: 0.3 }}>Close</Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Repair Notes / Upload Section */}
      <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
          Add Repair Notes / Upload Image
        </Typography>
        <Stack spacing={2}>
          <TextField label="Complaint ID" size="small" placeholder="e.g. C-002" sx={{ maxWidth: 200 }} />
          <TextField label="Repair Notes" multiline rows={3} placeholder="Describe what was repaired..." />
          <Button variant="outlined" component="label" sx={{ width: 'fit-content', borderRadius: '8px' }}>
            📷 Upload Repair Image
            <input type="file" hidden accept="image/*" />
          </Button>
          <Button variant="contained" sx={{ width: 'fit-content', borderRadius: '8px' }}>Save Notes</Button>
        </Stack>
      </Card>
    </DashboardLayout>
  );
};

export default MaintenanceDashboard;
