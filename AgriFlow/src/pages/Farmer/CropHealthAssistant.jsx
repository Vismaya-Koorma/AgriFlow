import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, TextField,
  MenuItem, Button, Alert, CircularProgress, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, InputAdornment, Stack, Paper, Divider
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import ScienceIcon from '@mui/icons-material/Science';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MemoryIcon from '@mui/icons-material/Memory';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { getCropHealthHistory, getFields } from '../../services/api';
import axiosInstance from '../../services/api';

const POPULAR_CROPS = [
  'Tomato', 'Paddy / Rice', 'Maize', 'Potato', 'Apple',
  'Banana', 'Cotton', 'Wheat', 'Chili', 'Coconut', 'Sugarcane', 'Other Crop'
];

const CropHealthAssistant = () => {
  // Form input state
  const [cropType, setCropType] = useState('Tomato');
  const [customCrop, setCustomCrop] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // User fields state
  const [userFields, setUserFields] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('All');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const fieldsData = await getFields();
      setUserFields(Array.isArray(fieldsData) ? fieldsData : (fieldsData.results || []));
    } catch (e) {
      console.error('Failed to load user fields:', e);
    }
    loadHistory();
  };

  const loadHistory = async (params = {}) => {
    setLoadingHistory(true);
    try {
      const data = await getCropHealthHistory(params);
      setHistoryList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load analysis history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleClearForm = () => {
    setSymptoms('');
    setErrorMsg('');
    setResult(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAnalyze = async () => {
    setErrorMsg('');

    if (!symptoms.trim() && !selectedImage) {
      setErrorMsg('Please enter crop symptoms text, upload a leaf image, or both.');
      return;
    }

    const finalCrop = cropType === 'Other Crop' && customCrop.trim() ? customCrop.trim() : cropType;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('crop_type', finalCrop);
      if (symptoms.trim()) formData.append('symptoms', symptoms.trim());
      if (selectedField) formData.append('field_id', selectedField);
      if (selectedImage) formData.append('image', selectedImage);

      const response = await axiosInstance.post('/crop-health/analyze/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      loadHistory();
    } catch (e) {
      console.error('Crop health analysis failed:', e);
      setErrorMsg(e.response?.data?.message || 'Failed to analyze crop health. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!historyList.length) return;
    const headers = ['ID', 'Date', 'Crop Type', 'Input Type', 'Status', 'Symptoms', 'Predicted Disease', 'AI Model Confidence (%)'];
    const rows = historyList.map(item => [
      item.id,
      new Date(item.created_at).toLocaleDateString(),
      `"${item.crop_type}"`,
      `"${item.input_type || 'text'}"`,
      `"${item.status || 'Healthy'}"`,
      `"${(item.symptoms || '').replace(/"/g, '""')}"`,
      `"${(item.predicted_disease || '').replace(/"/g, '""')}"`,
      item.confidence
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `agriflow_crop_health_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredHistory = historyList.filter(item => {
    const matchesCrop = cropFilter === 'All' || item.crop_type.toLowerCase() === cropFilter.toLowerCase();
    const matchesSearch = !searchQuery ||
      (item.symptoms && item.symptoms.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.status && item.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.crop_type && item.crop_type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCrop && matchesSearch;
  });

  const isHealthy = result?.status === 'Healthy';
  const isLowConfidence = result?.confidence_level === 'LOW' || (result?.confidence > 0 && result?.confidence < 60.0);

  return (
    <DashboardLayout title="AI Crop Health Assistant">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header Banner */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <MedicalServicesIcon sx={{ fontSize: 40, color: '#2E7D32' }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="#1b4332">
              AI Crop Health Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Powered by <strong>Sentence Transformers</strong> (Text Semantic Similarity) and <strong>MobileNetV2 CNN</strong> (Leaf Image Disease Classification).
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* ── 1. INPUT FORM CARD ── */}
          <Grid item xs={12} md={5}>
            <Card elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
              <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LocalFloristIcon sx={{ color: '#16a34a' }} />
                <Typography variant="h6" fontWeight={700} color="#166534">
                  Multi-Modal Diagnostic Input
                </Typography>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {errorMsg && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                    {errorMsg}
                  </Alert>
                )}

                <Grid container spacing={2.5}>
                  {/* Crop Selection */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Crop Type"
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      size="small"
                    >
                      {POPULAR_CROPS.map(c => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Field Selection (Optional) */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Select Field (Optional)"
                      value={selectedField}
                      onChange={(e) => setSelectedField(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">-- None --</MenuItem>
                      {userFields.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name} ({f.crop_type || 'Crop'})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {cropType === 'Other Crop' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Specify Custom Crop Name"
                        value={customCrop}
                        onChange={(e) => setCustomCrop(e.target.value)}
                        size="small"
                        placeholder="e.g. Cardamom, Tea, Pepper"
                      />
                    </Grid>
                  )}

                  {/* Symptom Text Area */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 0.5 }}>
                      1. Natural Language Symptoms (Sentence Transformer AI)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="e.g. Tomato leaves have concentric brown target spots with yellow chlorosis, OR leaves look healthy."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      variant="outlined"
                      sx={{ bgcolor: '#fafafa', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>

                  {/* Image Upload */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 0.5 }}>
                      2. Crop Leaf Image (MobileNetV2 CNN Model)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}
                      >
                        {selectedImage ? 'Change Image' : 'Choose Leaf Photo'}
                        <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                      </Button>
                      {imagePreview && (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={imagePreview}
                            alt="Leaf Preview"
                            style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', border: '2px solid #16a34a' }}
                          />
                          <IconButton
                            size="small"
                            onClick={handleClearImage}
                            sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#dc2626' } }}
                          >
                            <ClearIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {cropType === 'Other Crop' ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>
                          Disease detection is currently unavailable for this crop.
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 600 }}>
                          Image disease detection available for {cropType} (MobileNetV2)
                        </span>
                      )}
                    </Typography>
                  </Grid>

                  {/* Buttons */}
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleAnalyze}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MedicalServicesIcon />}
                        sx={{
                          py: 1.2,
                          borderRadius: 3,
                          fontWeight: 700,
                          bgcolor: '#2E7D32',
                          '&:hover': { bgcolor: '#1b4332' },
                          textTransform: 'none'
                        }}
                      >
                        {loading ? 'Analyzing with AI...' : 'Analyze Crop Health'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleClearForm}
                        disabled={loading}
                        sx={{ py: 1.2, px: 3, borderRadius: 3, textTransform: 'none', borderColor: '#cbd5e1', color: '#64748b' }}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ── 2. AI RESPONSE DISPLAY CARDS ── */}
          <Grid item xs={12} md={7}>
            {!result && !loading && (
              <Card elevation={1} sx={{ borderRadius: 4, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 5, bgcolor: '#f8fafc', border: '2px dashed #e2e8f0' }}>
                <Box textAlign="center">
                  <MemoryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 1.5 }} />
                  <Typography variant="h6" fontWeight={700} color="#64748b">
                    No Analysis Submitted Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" maxWidth={380} sx={{ mt: 0.5, mx: 'auto' }}>
                    Enter natural language symptoms, upload a leaf image, or both to get crop-validated predictions.
                  </Typography>
                </Box>
              </Card>
            )}

            {loading && (
              <Card elevation={2} sx={{ borderRadius: 4, p: 6, textAlign: 'center', bgcolor: '#fff' }}>
                <CircularProgress size={48} sx={{ color: '#2E7D32', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} color="#1e293b">
                  Running Neural AI Pipeline...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Encoding Sentence Transformer embeddings & evaluating MobileNetV2 CNN leaf classes.
                </Typography>
              </Card>
            )}

            {result && !loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Input Summary Banner */}
                <Paper elevation={1} sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Chip label={`Crop: ${result.crop_type}`} color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
                    {result.field_name && (
                      <Chip label={`Field: ${result.field_name}`} variant="outlined" sx={{ fontWeight: 700 }} />
                    )}
                    <Chip
                      label={`Input: ${result.input_type === 'both' ? 'Image + Symptoms' : result.input_type === 'image' ? 'Image Only' : 'Text Symptoms Only'}`}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Paper>

                {/* Field Crop Conflict Warning Alert */}
                {result.field_warning && (
                  <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 3, fontWeight: 600 }}>
                    {result.field_warning}
                  </Alert>
                )}

                {/* Unsupported Crop Image Notification Alert */}
                {result.image_analysis && result.image_analysis.supported === false && (
                  <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 3, fontWeight: 600 }}>
                    {result.image_analysis.message}
                  </Alert>
                )}

                {/* Low Confidence Warning Alert */}
                {isLowConfidence && (
                  <Alert severity="warning" sx={{ borderRadius: 3, fontWeight: 600 }}>
                    The prediction has low confidence ({result.confidence}%). Upload a clearer image of the affected leaf, spear leaf, or crown area and provide additional symptoms for better diagnosis.
                  </Alert>
                )}

                {/* Poor Image Quality Alert */}
                {(result.error === 'poor_image_quality' || (result.image_quality && result.image_quality !== 'acceptable')) && (
                  <Alert severity="error" icon={<WarningAmberIcon />} sx={{ borderRadius: 3, fontWeight: 600 }}>
                    {result.message || 'Unable to determine disease reliably. Please upload a clear image showing the affected leaf, spear leaf, or crown area.'}
                  </Alert>
                )}

                {/* Dynamic Title Header Banner Card */}
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 4,
                    bgcolor: isHealthy ? '#15803d' : isLowConfidence ? '#b45309' : '#1e293b',
                    color: '#fff',
                    p: 2.5
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isHealthy ? (
                        <CheckCircleOutlineIcon sx={{ color: '#86efac', fontSize: 26 }} />
                      ) : (
                        <WarningAmberIcon sx={{ color: '#fca5a5', fontSize: 26 }} />
                      )}
                      <Typography variant="h6" fontWeight={800}>
                        {isHealthy
                          ? `Crop Health Status: Healthy (${result.crop_type})`
                          : `Crop Health Diagnosis: ${result.status || 'Possible Stress'}`
                        }
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {result.evidence_status === 'STRONG' && (
                        <Chip label="Evidence Level: STRONG" size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 800 }} />
                      )}
                      {result.evidence_status === 'MODERATE' && (
                        <Chip label="Evidence Level: MODERATE" size="small" sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 800 }} />
                      )}
                      {result.evidence_status === 'CONFLICTING' && (
                        <Chip label="⚠ Evidence: CONFLICTING" size="small" sx={{ bgcolor: '#f97316', color: '#fff', fontWeight: 800 }} />
                      )}
                      {result.evidence_status === 'INSUFFICIENT' && (
                        <Chip label="⚠ Evidence: INSUFFICIENT" size="small" sx={{ bgcolor: '#eab308', color: '#000', fontWeight: 800 }} />
                      )}
                    </Stack>
                  </Box>
                </Card>

                {/* Sub-analysis cards for hybrid text + image */}
                {result.input_type === 'both' && (
                  <Grid container spacing={2}>
                    {result.text_analysis && (
                      <Grid item xs={12} sm={6}>
                        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <TextFieldsIcon sx={{ color: '#16a34a' }} />
                            <Typography variant="subtitle2" fontWeight={700} color="#166534">
                              Sentence Transformer (Text AI)
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="#334155">
                            Top Match: <strong>{result.text_analysis.disease_name || result.text_analysis.status}</strong>
                          </Typography>
                          <Typography variant="body2" color="#334155">
                            Semantic Similarity: <strong>{result.text_analysis.confidence}%</strong>
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {result.image_analysis && (
                      <Grid item xs={12} sm={6}>
                        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, bgcolor: result.image_analysis.supported === false ? '#fffbebf' : '#f0f9ff', border: result.image_analysis.supported === false ? '1px solid #fde68a' : '1px solid #bae6fd' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <ImageSearchIcon sx={{ color: result.image_analysis.supported === false ? '#b45309' : '#0284c7' }} />
                            <Typography variant="subtitle2" fontWeight={700} color={result.image_analysis.supported === false ? '#92400e' : '#075985'}>
                              MobileNetV2 CNN (Image AI)
                            </Typography>
                          </Stack>
                          {result.image_analysis.supported === false ? (
                            <Typography variant="body2" color="#92400e" fontWeight={500}>
                              Unsupported Crop Image Model
                            </Typography>
                          ) : (
                            <>
                              <Typography variant="body2" color="#334155">
                                Predicted Class: <strong>{result.image_analysis.disease_name || result.image_analysis.status}</strong>
                              </Typography>
                              <Typography variant="body2" color="#334155">
                                Calibrated Confidence (T=1.25): <strong>{result.image_analysis.confidence}%</strong>
                              </Typography>
                            </>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                )}

                {/* 4 Response Output Cards */}
                <Grid container spacing={2}>
                  {/* Card A: Status / Possible Causes */}
                  <Grid item xs={12} sm={6}>
                    <Card
                      elevation={2}
                      sx={{
                        borderRadius: 3,
                        height: '100%',
                        borderLeft: isHealthy ? '5px solid #16a34a' : '5px solid #ef4444'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          {isHealthy ? (
                            <CheckCircleOutlineIcon sx={{ color: '#16a34a' }} />
                          ) : (
                            <WarningAmberIcon sx={{ color: '#ef4444' }} />
                          )}
                          <Typography variant="subtitle1" fontWeight={700} color={isHealthy ? '#166534' : '#991b1b'}>
                            {isHealthy ? 'Health Assessment' : 'Possible Causes'}
                          </Typography>
                        </Box>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {(result.possible_causes || []).map((cause, i) => (
                            <Typography component="li" key={i} variant="body2" color="#334155" sx={{ mb: 0.8, fontWeight: 500 }}>
                              {cause}
                            </Typography>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Card B: Recommended Control Measures / Treatment */}
                  <Grid item xs={12} sm={6}>
                    <Card elevation={2} sx={{ borderRadius: 3, height: '100%', borderLeft: '5px solid #d97706' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <ScienceIcon sx={{ color: '#d97706' }} />
                          <Typography variant="subtitle1" fontWeight={700} color="#92400e">
                            {isHealthy ? 'Maintenance Guidance' : 'Recommended Control Measures'}
                          </Typography>
                        </Box>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {(result.control_measures || result.treatment || []).map((measure, i) => (
                            <Typography component="li" key={i} variant="body2" color="#334155" sx={{ mb: 0.8, fontWeight: 500 }}>
                              {measure}
                            </Typography>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Card C: Nutrient Management (Separated from Fungicides/Control) */}
                  {(result.nutrient_management && result.nutrient_management.length > 0) && (
                    <Grid item xs={12}>
                      <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #16a34a', bgcolor: '#f0fdf4' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <ScienceIcon sx={{ color: '#16a34a' }} />
                            <Typography variant="subtitle1" fontWeight={700} color="#166534">
                              Nutrient Management
                            </Typography>
                          </Box>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {(result.nutrient_management || []).map((nutr, i) => (
                              <Typography component="li" key={i} variant="body2" color="#334155" sx={{ mb: 0.8, fontWeight: 500 }}>
                                {nutr}
                              </Typography>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Card D: Watering Advice */}
                  <Grid item xs={12}>
                    <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #0284c7', bgcolor: '#f0f9ff' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <WaterDropIcon sx={{ color: '#0284c7' }} />
                          <Typography variant="subtitle1" fontWeight={700} color="#075985">
                            Watering Advice
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="#1e293b" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                          {result.watering_advice}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Card E: Prevention & Monitoring Tips */}
                  <Grid item xs={12}>
                    <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #8b5cf6' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <ShieldIcon sx={{ color: '#8b5cf6' }} />
                          <Typography variant="subtitle1" fontWeight={700} color="#5b21b6">
                            {isHealthy ? 'Maintenance & Monitoring Tips' : 'Prevention & Control Tips'}
                          </Typography>
                        </Box>
                        <Grid container spacing={1}>
                          {(result.prevention || []).map((tip, i) => (
                            <Grid item xs={12} sm={6} key={i}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: '#f8fafc', p: 1.2, borderRadius: 2 }}>
                                <Chip label={i + 1} size="small" sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#8b5cf6', color: '#fff' }} />
                                <Typography variant="body2" color="#334155" fontWeight={500}>
                                  {tip}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>

        {/* ── 3. ANALYSIS HISTORY & REPORTS TABLE ── */}
        <Box sx={{ mt: 5 }}>
          <Card elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <HistoryIcon sx={{ color: '#2E7D32' }} />
                <Typography variant="h6" fontWeight={800} color="#1e293b">
                  Diagnosis History (Sentence Transformers & MobileNetV2)
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                <TextField
                  placeholder="Search symptoms or crops..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: 220, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  select
                  size="small"
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  sx={{ width: 150, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                  <MenuItem value="All">All Crops</MenuItem>
                  {POPULAR_CROPS.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportCSV}
                  startIcon={<FileDownloadIcon />}
                  sx={{ textTransform: 'none', borderRadius: 3, fontWeight: 700, borderColor: '#cbd5e1', color: '#334155' }}
                >
                  Export CSV
                </Button>
              </Stack>
            </Box>

            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Crop</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Input Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Symptoms / Notes</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>REAL ML Model Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} color="success" />
                      </TableCell>
                    </TableRow>
                  ) : filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        No crop health diagnosis records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1b4332' }}>
                          {row.crop_type}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.input_type || 'text'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem', textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status || 'Healthy'}
                            size="small"
                            color={row.status === 'Healthy' ? 'success' : row.status?.includes('Nutrient') ? 'warning' : 'error'}
                            sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#334155', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.symptoms || row.predicted_disease || 'Leaf image upload'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${row.confidence}%`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 800, height: 22, fontSize: '0.75rem', borderColor: '#94a3b8' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default CropHealthAssistant;
