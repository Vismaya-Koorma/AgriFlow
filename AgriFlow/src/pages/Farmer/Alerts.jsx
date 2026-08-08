import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Button, Chip, Stack, CircularProgress, Alert as MuiAlert,
  IconButton, Paper, MenuItem, TextField, Tooltip
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloudRainIcon from '@mui/icons-material/Thunderstorm';
import WaterIcon from '@mui/icons-material/Water';
import SettingsIcon from '@mui/icons-material/Settings';
import { getAlerts, resolveAlert } from '../../services/api';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, typeFilter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.alert_type = typeFilter;
      const data = await getAlerts(params);
      setAlerts(data);
    } catch (e) {
      console.error('Error fetching alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      fetchAlerts();
    } catch (e) {
      console.error('Error resolving alert:', e);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'high':
        return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <WarningIcon sx={{ color: '#dc2626' }} /> };
      case 'medium':
        return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <WarningIcon sx={{ color: '#d97706' }} /> };
      default:
        return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <InfoIcon sx={{ color: '#2563eb' }} /> };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'weather':
        return <CloudRainIcon color="info" />;
      case 'irrigation':
        return <WaterIcon color="primary" />;
      default:
        return <SettingsIcon color="action" />;
    }
  };

  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const resolvedAlerts = alerts.filter(a => a.is_resolved);

  return (
    <DashboardLayout title="Alerts & System Notifications">
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
              System & Weather Alerts
            </Typography>
            <Chip
              label={`${activeAlerts.length} Active`}
              color={activeAlerts.length > 0 ? "error" : "success"}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Stay notified of high-priority weather events, moisture stress, and system recommendations.
          </Typography>
        </Box>

        {/* Filter Controls */}
        <Stack direction="row" spacing={2}>
          <TextField
            select
            size="small"
            label="Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All Severities</MenuItem>
            <MenuItem value="high">🔴 High</MenuItem>
            <MenuItem value="medium">🟡 Medium</MenuItem>
            <MenuItem value="low">🔵 Low</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Alert Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="weather">Weather</MenuItem>
            <MenuItem value="irrigation">Irrigation</MenuItem>
            <MenuItem value="system">System</MenuItem>
          </TextField>
        </Stack>
      </Box>

      {/* Main Active Alerts List */}
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
          Active Unresolved Alerts
        </Typography>

        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress color="success" size={28} /></Box>
        ) : activeAlerts.length === 0 ? (
          <MuiAlert severity="success" sx={{ borderRadius: '12px' }}>
            No active alerts! All fields and weather conditions are optimal.
          </MuiAlert>
        ) : (
          <Stack spacing={2}>
            {activeAlerts.map((alert) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <Paper
                  key={alert.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    bgcolor: style.bg,
                    border: `1px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {style.icon}
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {alert.title}
                        </Typography>
                        <Chip label={alert.severity.toUpperCase()} size="small" sx={{ bgcolor: style.border, color: style.color, fontWeight: 700, fontSize: 10 }} />
                        <Chip label={alert.alert_type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Field: <strong>{alert.field_name}</strong> | Created: {new Date(alert.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleResolve(alert.id)}
                    sx={{ borderRadius: '8px', textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Mark Resolved
                  </Button>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Card>

      {/* Resolved History */}
      {resolvedAlerts.length > 0 && (
        <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#64748b', mb: 2 }}>
            Resolved Alerts History ({resolvedAlerts.length})
          </Typography>
          <Stack spacing={1.5}>
            {resolvedAlerts.map((alert) => (
              <Box
                key={alert.id}
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  bgcolor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ textDecoration: 'line-through', color: '#64748b', fontWeight: 600 }}>
                    {alert.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.message} — Resolved on {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : 'Recently'}
                  </Typography>
                </Box>
                <Chip label="Resolved" size="small" color="default" />
              </Box>
            ))}
          </Stack>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default AlertsPage;
