import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Tabs, Tab, IconButton,
  Alert, CircularProgress, Paper, Divider, Avatar
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import EventNoteIcon from '@mui/icons-material/EventNote';

import {
  getSupervisorAssignments,
  getFarmVisits,
  getInspectionReports,
  getFields,
  getFieldInspections
} from '../../services/api';

const STATUS_COLOR = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  RESCHEDULED: 'secondary',
  MISSED: 'error',
  CANCELLED: 'default',
};

const FarmerSupervisorVisits = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Data states
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [reports, setReports] = useState([]);
  const [fields, setFields] = useState([]);

  // Field inspection dialog state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedFieldInfo, setSelectedFieldInfo] = useState(null);
  const [fieldInspections, setFieldInspections] = useState([]);

  // Inspection Report Dialog
  const [openReportModal, setOpenReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [assignData, visitsData, reportsData, fieldsData] = await Promise.all([
        getSupervisorAssignments(),
        getFarmVisits(),
        getInspectionReports(),
        getFields()
      ]);
      setAssignments(assignData.results || assignData || []);
      setVisits(visitsData.results || visitsData || []);
      setReports(reportsData.results || reportsData || []);
      setFields(Array.isArray(fieldsData) ? fieldsData : (fieldsData?.results || []));
    } catch (err) {
      setErrorMsg('Failed to load your supervisor visit schedule.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingVisits = visits.filter(v => v.scheduled_date >= todayStr && v.status === 'SCHEDULED');
  const pastVisits = visits.filter(v => v.status === 'COMPLETED' || v.status === 'MISSED' || v.scheduled_date < todayStr);

    const handleOpenFieldInspection = async (field) => {
    setSelectedFieldInfo(field);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await getFieldInspections(field.id);
      setFieldInspections(res.inspections || []);
    } catch (err) {
      console.error(err);
      if (field.latest_inspection_summary) {
        setFieldInspections([{
          id: field.latest_inspection_summary.id || 1,
          decision: field.verification_status,
          rejection_reason: field.latest_inspection_summary.rejection_reason,
          reinspection_scheduled_date: field.latest_inspection_summary.reinspection_scheduled_date,
          supervisor_name: field.latest_inspection_summary.supervisor_name,
          inspection_date: field.latest_inspection_summary.inspection_date || new Date().toISOString(),
          criterion_results: []
        }]);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setOpenReportModal(true);
  };

  // Calendar grouping by month/day
  const visitsByDate = visits.reduce((acc, v) => {
    acc[v.scheduled_date] = acc[v.scheduled_date] || [];
    acc[v.scheduled_date].push(v);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Field Supervisor Visits
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              View your assigned supervisor, weekly visit schedule, inspection findings, and expert recommendations.
            </Typography>
          </Box>
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {errorMsg && <Alert severity="error" sx={{ mb: 2.5 }}>{errorMsg}</Alert>}

      {/* SECTION A: MY ASSIGNED SUPERVISOR */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b' }}>
          My Assigned Field Supervisor
        </Typography>
        {assignments.length === 0 ? (
          <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              No field supervisor has been assigned to your farm yet. The canal administration will schedule one soon.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {assignments.map((a) => (
              <Grid item xs={12} md={6} key={a.id}>
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: '#1565C0', width: 56, height: 56 }}>
                      {a.supervisor_name?.charAt(0) || 'S'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {a.supervisor_name}
                        </Typography>
                        <Chip
                          label={a.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={a.is_active ? 'success' : 'default'}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Field Supervisor for <strong>{a.farm_name}</strong> {a.field_name ? `(${a.field_name})` : ''}
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        {a.supervisor_phone && (
                          <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon fontSize="inherit" color="action" /> {a.supervisor_phone}
                          </Typography>
                        )}
                        {a.supervisor_email && (
                          <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon fontSize="inherit" color="action" /> {a.supervisor_email}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: '#1565C0', fontWeight: 600 }}>
                      🗓️ Weekly Visit: Every {a.weekly_visit_day_display}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                      ⏰ Time Slot: {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}
                    </Typography>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

            {/* SECTION A.2: FIELD GROUND TRUTH VERIFICATION & REJECTION STATUS */}
      {fields.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  Field Ground Truth Verification & Inspection Status
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Live verification decisions and mandatory criteria inspection results from your assigned supervisor.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/farmer/fields')}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
              >
                Manage Fields →
              </Button>
            </Box>

            <Grid container spacing={2}>
              {fields.map((fld) => {
                const isRej = fld.verification_status === 'rejected' || fld.verification_status === 'needs_improvement';
                const isVer = fld.verification_status === 'verified';
                const summary = fld.latest_inspection_summary;

                return (
                  <Grid item xs={12} sm={6} md={4} key={fld.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: isRej ? '#fca5a5' : isVer ? '#86efac' : '#e2e8f0',
                        bgcolor: isRej ? '#fef2f2' : isVer ? '#f0fdf4' : '#f8fafc'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {fld.name}
                        </Typography>
                        <Chip
                          label={(fld.verification_status || 'PENDING').replace('_', ' ').toUpperCase()}
                          size="small"
                          color={isRej ? 'error' : isVer ? 'success' : 'warning'}
                          sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                        {fld.farm_name || 'Farm'} • {fld.crop_type_name || 'Crop'} {fld.crop_variety_name ? `(${fld.crop_variety_name})` : ''} • {fld.area} Acres
                      </Typography>

                      {isRej ? (
                        <Box sx={{ mt: 1, p: 1.2, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid #fecaca' }}>
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>
                            Deficiency / Reason:
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.5 }}>
                            {summary?.rejection_reason || 'Criteria deficiency recorded during supervisor inspection.'}
                          </Typography>
                          {summary?.reinspection_scheduled_date && (
                            <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600, display: 'block' }}>
                              🗓️ Re-inspection: {summary.reinspection_scheduled_date}
                            </Typography>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleOpenFieldInspection(fld)}
                            sx={{ mt: 1, textTransform: 'none', fontSize: '0.7rem', py: 0.2, fontWeight: 700 }}
                          >
                            View Corrective Actions
                          </Button>
                        </Box>
                      ) : isVer ? (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                            ✓ Ground truth verified by supervisor
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', display: 'block', mt: 1 }}>
                          Awaiting scheduled supervisor inspection.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>
        </Box>
      )}

      {/* TABS CONTAINER */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label={`Upcoming Visits (${upcomingVisits.length})`} sx={{ fontWeight: 600 }} />
            <Tab label={`Visit History & Inspections (${pastVisits.length})`} sx={{ fontWeight: 600 }} />
            <Tab label="Interactive Schedule Calendar" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* SECTION B: UPCOMING VISITS */}
        {activeTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {upcomingVisits.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                <CalendarMonthIcon sx={{ fontSize: 48, mb: 1.5, color: '#cbd5e1' }} />
                <Typography variant="h6">No upcoming visits scheduled.</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      {['Farm', 'Scheduled Date', 'Day of Week', 'Time Window', 'Supervisor', 'Status'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingVisits.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{v.farm_name} {v.field_name ? `(${v.field_name})` : ''}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1565C0' }}>{v.scheduled_date}</TableCell>
                        <TableCell>{new Date(v.scheduled_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}</TableCell>
                        <TableCell>{v.scheduled_start_time?.slice(0, 5)} - {v.scheduled_end_time?.slice(0, 5)}</TableCell>
                        <TableCell>{v.supervisor_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={v.status_display || v.status}
                            size="small"
                            color={STATUS_COLOR[v.status] || 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* SECTION C & E: VISIT HISTORY & INSPECTION REPORTS */}
        {activeTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Farm', 'Scheduled Window', 'Actual Visit Time', 'Supervisor', 'Crop Condition', 'Status', 'Inspection Report'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pastVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        No past visit records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pastVisits.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{v.farm_name}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.scheduled_date}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {v.scheduled_start_time?.slice(0, 5)} - {v.scheduled_end_time?.slice(0, 5)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {v.actual_start_time ? (
                            <Box>
                              <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                                {new Date(v.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {v.actual_end_time && ` - ${new Date(v.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {new Date(v.actual_start_time).toLocaleDateString()}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {v.status === 'MISSED' ? 'Not conducted (Missed)' : 'Pending completion'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{v.supervisor_name}</TableCell>
                        <TableCell>
                          {v.inspection_report ? (
                            <Chip label={v.inspection_report.crop_condition} size="small" color="success" />
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={v.status_display || v.status}
                            size="small"
                            color={STATUS_COLOR[v.status] || 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          {v.inspection_report ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleOpenReport(v.inspection_report)}
                              sx={{ borderRadius: '6px' }}
                            >
                              View Report
                            </Button>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>No report</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* SECTION D: INTERACTIVE CALENDAR VIEW */}
        {activeTab === 2 && (
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Legend:</Typography>
              <Chip label="Scheduled" size="small" color="info" />
              <Chip label="In Progress" size="small" color="warning" />
              <Chip label="Completed" size="small" color="success" />
              <Chip label="Rescheduled" size="small" color="secondary" />
              <Chip label="Missed" size="small" color="error" />
            </Stack>

            <Grid container spacing={2}>
              {Object.keys(visitsByDate).sort().slice(0, 14).map((d) => (
                <Grid item xs={12} sm={6} md={4} key={d}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        📅 {d}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                      </Typography>
                    </Stack>
                    {visitsByDate[d].map((visit) => (
                      <Box key={visit.id} sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '8px', mb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {visit.farm_name}
                          </Typography>
                          <Chip
                            label={visit.status}
                            size="small"
                            color={STATUS_COLOR[visit.status] || 'default'}
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          ⏰ {visit.scheduled_start_time?.slice(0, 5)} - {visit.scheduled_end_time?.slice(0, 5)} • {visit.supervisor_name}
                        </Typography>
                      </Box>
                    ))}
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Card>

      {/* SECTION E: INSPECTION REPORT MODAL (READ-ONLY) */}
      <Dialog open={openReportModal} onClose={() => setOpenReportModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Field Inspection Report — {selectedReport?.farm_name}
        </DialogTitle>
        <DialogContent dividers>
          {selectedReport && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Supervisor</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReport.supervisor_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Inspection Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(selectedReport.submitted_at).toLocaleDateString()} at {new Date(selectedReport.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>1. Crop Condition</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2E7D32' }}>{selectedReport.crop_condition}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>2. Crop Growth Stage</Typography>
                <Typography variant="body2">{selectedReport.crop_growth_stage || 'Not specified'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>3. Soil & Field Observations</Typography>
                <Typography variant="body2">{selectedReport.soil_and_field_observations}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>4. Irrigation System Status</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReport.irrigation_system_status}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>5. Water Availability Observations</Typography>
                <Typography variant="body2">{selectedReport.water_availability_and_observations}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>6. Pest or Disease Symptoms</Typography>
                <Typography variant="body2">{selectedReport.pest_or_disease_symptoms || 'None'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>7. Fertilizer / Pesticide Observations</Typography>
                <Typography variant="body2">{selectedReport.fertilizer_or_pesticide_observations || 'None recorded'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>
                    8. Recommended Agricultural Actions
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#14532d' }}>
                    {selectedReport.recommended_agricultural_actions}
                  </Typography>
                </Paper>
              </Grid>

              {selectedReport.maintenance_issues && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>9. Maintenance Issues</Typography>
                  <Typography variant="body2">{selectedReport.maintenance_issues}</Typography>
                </Grid>
              )}

              {selectedReport.follow_up_required && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <strong>Follow-up inspection required:</strong> {selectedReport.follow_up_notes}
                  </Alert>
                </Grid>
              )}

              {selectedReport.next_recommended_visit_date && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#1565C0', fontWeight: 600 }}>
                    📅 Next Recommended Visit Date: {selectedReport.next_recommended_visit_date}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReportModal(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* DETAILED VERIFICATION / REJECTION REPORT MODAL */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Field Ground Truth Inspection Details
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Field: <strong>{selectedFieldInfo?.name}</strong> • Farm: <strong>{selectedFieldInfo?.farm_name}</strong>
              </Typography>
            </Box>
            {selectedFieldInfo && (
              <Chip
                label={(selectedFieldInfo.verification_status || 'PENDING').replace('_', ' ').toUpperCase()}
                color={STATUS_COLOR[selectedFieldInfo.verification_status] || 'warning'}
                sx={{ fontWeight: 800 }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {detailLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>Loading inspection findings...</Typography>
            </Box>
          ) : fieldInspections.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#475569' }}>
                No Inspection Conducted Yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Your field is currently in <strong>PENDING</strong> verification status. An assigned supervisor will inspect your field criteria during an upcoming visit.
              </Typography>
            </Box>
          ) : (
            fieldInspections.map((insp) => (
              <Box key={insp.id} sx={{ mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Supervisor</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {insp.supervisor_name || insp.supervisor_username || 'Field Supervisor'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Inspection Date</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {new Date(insp.inspection_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {insp.rejection_reason && (
                  <Alert severity={insp.decision === 'rejected' ? 'error' : 'warning'} sx={{ mb: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {insp.decision === 'rejected' ? 'Rejection Reason & Deficiencies:' : 'Improvement Required:'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {insp.rejection_reason}
                    </Typography>
                  </Alert>
                )}

                {insp.reinspection_scheduled_date && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    <strong>Scheduled Re-inspection Date:</strong> {insp.reinspection_scheduled_date}. Please ensure recommended corrective actions are implemented before this date.
                  </Alert>
                )}

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                  Criteria Assessment Breakdown:
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Inspection Criterion</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Supervisor Notes / Measured</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Failure Cause & Corrective Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {insp.criterion_results && insp.criterion_results.length > 0 ? (
                        insp.criterion_results.map((cr) => (
                          <TableRow key={cr.id} sx={{ bgcolor: cr.result === 'fail' ? '#fef2f2' : 'inherit' }}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {cr.criterion_name}
                              {cr.criterion_is_critical && (
                                <Chip label="CRITICAL" size="small" color="error" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={cr.result.replace('_', ' ').toUpperCase()}
                                size="small"
                                color={cr.result === 'pass' ? 'success' : cr.result === 'fail' ? 'error' : 'default'}
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              {cr.measured_value !== null && cr.measured_value !== undefined && (
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                  Measured: {cr.measured_value} {cr.measured_unit || ''}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: '#475569' }}>
                                {cr.observation || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {cr.result === 'fail' ? (
                                <Box>
                                  {cr.failure_reason && (
                                    <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontWeight: 600 }}>
                                      Deficiency: {cr.failure_reason}
                                    </Typography>
                                  )}
                                  {cr.corrective_action && (
                                    <Typography variant="caption" sx={{ display: 'block', color: '#16a34a', fontWeight: 600, mt: 0.5 }}>
                                      Action Required: {cr.corrective_action}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#16a34a' }}>
                                  Criterion Satisfied
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2, color: '#64748b' }}>
                            Inspection recorded with decision: <strong>{insp.decision.toUpperCase()}</strong>.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default FarmerSupervisorVisits;
