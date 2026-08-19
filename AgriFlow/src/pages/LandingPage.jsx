import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Stack,
  Chip,
  Snackbar,
  Alert,
  Divider,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import AgricultureIcon from '@mui/icons-material/Agriculture';
import MenuIcon from '@mui/icons-material/Menu';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SecurityIcon from '@mui/icons-material/Security';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleScrollTo = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    if (mobileOpen) setMobileOpen(false);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setToast({ open: true, message: 'Please fill in all required fields.', severity: 'error' });
      return;
    }
    setToast({
      open: true,
      message: 'Thank you for reaching out! Our team will contact you shortly.',
      severity: 'success',
    });
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const navLinks = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Services', target: 'services' },
    { label: 'Contact', target: 'contact' },
  ];

  return (
    <Box sx={{ bgcolor: '#0b1911', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* ─────────────────────────────────────────────────────────────────
          NAVBAR
         ───────────────────────────────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(11, 25, 17, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          py: 0.5,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            {/* Brand Logo */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
              onClick={() => handleScrollTo('home')}
            >
              <Box
                component="img"
                src="/agriflow-logo.jpg"
                alt="AgriFlow AI Logo"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  objectFit: 'cover',
                  boxShadow: '0 0 20px rgba(46, 125, 50, 0.5)',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff' }}>
                AgriFlow <span style={{ color: '#4caf50' }}>AI</span>
              </Typography>
            </Box>

            {/* Desktop Navigation Links */}
            {!isMobile && (
              <Stack direction="row" spacing={3} alignItems="center">
                {navLinks.map((link) => (
                  <Button
                    key={link.target}
                    onClick={() => handleScrollTo(link.target)}
                    sx={{
                      color: '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      '&:hover': { color: '#4caf50', bgcolor: 'transparent' },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Stack>
            )}

            {/* Desktop Auth Buttons */}
            {!isMobile && (
              <Stack direction="row" spacing={1.5}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(76, 175, 80, 0.5)',
                    color: '#4caf50',
                    fontWeight: 700,
                    borderRadius: '10px',
                    px: 2.5,
                    textTransform: 'none',
                    '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76, 175, 80, 0.1)' },
                  }}
                >
                  Log In
                </Button>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  sx={{
                    bgcolor: '#2e7d32',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '10px',
                    px: 2.5,
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)',
                    '&:hover': { bgcolor: '#1b5e20' },
                  }}
                >
                  Register
                </Button>
              </Stack>
            )}

            {/* Mobile Menu Icon */}
            {isMobile && (
              <IconButton onClick={handleDrawerToggle} sx={{ color: '#ffffff' }}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: { width: 280, bgcolor: '#0f2318', color: '#ffffff', p: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box component="img" src="/agriflow-logo.jpg" alt="AgriFlow Logo" sx={{ width: 40, height: 40, borderRadius: "10px", border: "2px solid #4caf50" }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            AgriFlow AI
          </Typography>
        </Box>
        <List>
          {navLinks.map((link) => (
            <ListItem button key={link.target} onClick={() => handleScrollTo(link.target)} sx={{ py: 1.5 }}>
              <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            fullWidth
            sx={{ borderColor: '#4caf50', color: '#4caf50', fontWeight: 700, textTransform: 'none' }}
          >
            Log In
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            fullWidth
            sx={{ bgcolor: '#2e7d32', color: '#ffffff', fontWeight: 700, textTransform: 'none' }}
          >
            Register Account
          </Button>
        </Stack>
      </Drawer>

      {/* ─────────────────────────────────────────────────────────────────
          HERO SECTION (#home)
         ───────────────────────────────────────────────────────────────── */}
      <Box
        id="home"
        sx={{
          position: 'relative',
          py: { xs: 8, md: 14 },
          backgroundImage: 'url(/irrigation-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(7, 16, 11, 0.88) 0%, rgba(11, 25, 17, 0.82) 60%, rgba(11, 25, 17, 0.65) 100%)',
            zIndex: 0,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="🌱 Smart Agriculture & Telemetry Platform"
                sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.15)',
                  color: '#81c784',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  mb: 3,
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                  lineHeight: 1.15,
                  mb: 3,
                  color: '#ffffff',
                }}
              >
                Precision Irrigation <br />
                <span style={{ background: 'linear-gradient(90deg, #4caf50, #81c784)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Powered by AI
                </span>
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: '#94a3b8', fontSize: { xs: '1rem', sm: '1.15rem' }, mb: 4, lineHeight: 1.7, maxWidth: 600 }}
              >
                Empowering Kerala's agricultural ecosystem with real-time soil telemetry, predictive weather monitoring, and automated smart valve recommendations. Save water, boost yields, and streamline farm management.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#2e7d32',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    px: 4,
                    py: 1.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    boxShadow: '0 8px 24px rgba(46, 125, 50, 0.4)',
                    '&:hover': { bgcolor: '#1b5e20' },
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    px: 4,
                    py: 1.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76, 175, 80, 0.1)' },
                  }}
                >
                  Access Dashboard
                </Button>
              </Stack>

              {/* Stats badges */}
              <Grid container spacing={3} sx={{ mt: 5 }}>
                {[
                  { value: '99.4%', label: 'Water Precision' },
                  { value: '10k+ Acres', label: 'Monitored Fields' },
                  { value: '24/7', label: 'Automated Telemetry' },
                ].map((stat) => (
                  <Grid item xs={4} key={stat.label}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#4caf50' }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Right Card / Graphic */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  position: 'relative',
                  p: 3,
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(46, 125, 50, 0.15) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#81c784', fontWeight: 700 }}>
                    LIVE SYSTEM TELEMETRY
                  </Typography>
                  <Chip label="ACTIVE" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', fontWeight: 800 }} />
                </Box>
                <Stack spacing={2.5}>
                  {[
                    { label: 'Alappuzha Paddy Zone #4', status: 'Optimal Moisture (68%)', icon: <WaterDropIcon sx={{ color: '#29b6f6' }} /> },
                    { label: 'Wayanad Tea Estate #2', status: 'AI Irrigation Scheduled', icon: <SpeedIcon sx={{ color: '#ab47bc' }} /> },
                    { label: 'Palakkad Paddy Field #1', status: 'Rainfall Confirmed (18mm)', icon: <CloudQueueIcon sx={{ color: '#ffb74d' }} /> },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: '16px',
                        bgcolor: 'rgba(15, 35, 24, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {item.icon}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {item.status}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────
          ABOUT SECTION (#about)
         ───────────────────────────────────────────────────────────────── */}
      <Box id="about" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#0f2318' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                <AgricultureIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: '#ffffff' }}>
                  Empowering Agriculture with Intelligence
                </Typography>
                <Typography variant="body1" sx={{ color: '#94a3b8', lineHeight: 1.8, mb: 2 }}>
                  AgriFlow AI bridges modern Internet of Things (IoT) sensors with machine learning models to eliminate water guesswork for farmers and agricultural managers.
                </Typography>
                <Typography variant="body1" sx={{ color: '#94a3b8', lineHeight: 1.8 }}>
                  Designed specifically to address agricultural requirements in Kerala, our platform connects Farmers, Supervisors, Water Managers, and Maintenance Technicians under a single unified dashboard.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                {[
                  {
                    title: 'Real-time Telemetry',
                    desc: 'Continuous monitoring of soil moisture, ambient humidity, temperature, and wind speed.',
                  },
                  {
                    title: 'Predictive AI Recommendations',
                    desc: 'Machine learning algorithms calculate exact volume and duration needed for irrigation.',
                  },
                  {
                    title: 'Multi-Role Administration',
                    desc: 'Role-based access control for Farmers, Field Supervisors, Regional Water Managers, and Admin.',
                  },
                ].map((feature, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 3,
                      borderRadius: '16px',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', borderColor: '#4caf50' },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50', mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                      {feature.desc}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────
          SERVICES / FEATURES SECTION (#services)
         ───────────────────────────────────────────────────────────────── */}
      <Box id="services" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#0b1911' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: '#ffffff' }}>
              Comprehensive Services & Capabilities
            </Typography>
            <Typography variant="body1" sx={{ color: '#94a3b8', maxWidth: 650, mx: 'auto' }}>
              Explore the core modules engineered into the AgriFlow AI ecosystem to optimize agricultural productivity.
            </Typography>
          </Box>

          <Grid container spacing={3.5}>
            {[
              {
                icon: <WaterDropIcon sx={{ fontSize: 40, color: '#29b6f6' }} />,
                title: 'Soil Moisture Estimation',
                desc: 'Deep sensor analysis estimating volumetric water content across root zone depths.',
              },
              {
                icon: <SpeedIcon sx={{ fontSize: 40, color: '#ab47bc' }} />,
                title: 'Irrigation Recommendation Engine',
                desc: 'Generates field-specific watering schedules based on crop type, rainfall, and soil classification.',
              },
              {
                icon: <CloudQueueIcon sx={{ fontSize: 40, color: '#ffb74d' }} />,
                title: 'Weather & Rainfall Integration',
                desc: 'Combines local weather station telemetry with satellite rainfall confirmations.',
              },
              {
                icon: <SecurityIcon sx={{ fontSize: 40, color: '#66bb6a' }} />,
                title: 'Crop Stress & Risk Management',
                desc: 'Early warning alert notifications flagging drought stress and priority water allocation.',
              },
            ].map((service, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    bgcolor: 'rgba(15, 35, 24, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    p: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#4caf50',
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 30px rgba(46, 125, 50, 0.2)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ mb: 2 }}>{service.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#ffffff' }}>
                      {service.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                      {service.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────
          CONTACT SECTION (#contact)
         ───────────────────────────────────────────────────────────────── */}
      <Box id="contact" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#0f2318' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={5}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: '#ffffff' }}>
                Get In Touch With Us
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4, lineHeight: 1.7 }}>
                Have questions about onboarding your farm or integrating IoT valve controllers? Contact our technical team today.
              </Typography>

              <Stack spacing={3}>
                {[
                  { icon: <LocationOnIcon sx={{ color: '#4caf50' }} />, title: 'Headquarters', detail: 'AgriFlow AI Innovation Hub, Ernakulam, Kerala' },
                  { icon: <PhoneIcon sx={{ color: '#4caf50' }} />, title: 'Helpline', detail: '+91 (484) 280-9000' },
                  { icon: <EmailIcon sx={{ color: '#4caf50' }} />, title: 'Email Support', detail: 'support@agriflow.in' },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', p: 1.5, borderRadius: '12px' }}>
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        {item.detail}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Grid>

            {/* Contact Form */}
            <Grid item xs={12} md={7}>
              <Paper
                component="form"
                onSubmit={handleContactSubmit}
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: '24px',
                  bgcolor: 'rgba(11, 25, 17, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#ffffff' }}>
                  Send a Message
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Name"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: '#4caf50' },
                        },
                        '& .MuiInputLabel-root': { color: '#94a3b8' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: '#4caf50' },
                        },
                        '& .MuiInputLabel-root': { color: '#94a3b8' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: '#4caf50' },
                        },
                        '& .MuiInputLabel-root': { color: '#94a3b8' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Your Message"
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: '#4caf50' },
                        },
                        '& .MuiInputLabel-root': { color: '#94a3b8' },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{
                        bgcolor: '#2e7d32',
                        color: '#ffffff',
                        fontWeight: 700,
                        py: 1.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#1b5e20' },
                      }}
                    >
                      Submit Inquiry
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────
          FOOTER
         ───────────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#07100b', py: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="img" src="/agriflow-logo.jpg" alt="AgriFlow Logo" sx={{ width: 28, height: 28, borderRadius: "6px" }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff' }}>
                AgriFlow AI Platform © {new Date().getFullYear()}
              </Typography>
            </Box>
            <Stack direction="row" spacing={3}>
              <Button onClick={() => handleScrollTo('home')} sx={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'none' }}>
                Home
              </Button>
              <Button onClick={() => handleScrollTo('about')} sx={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'none' }}>
                About
              </Button>
              <Button onClick={() => handleScrollTo('contact')} sx={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'none' }}>
                Contact
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LandingPage;
