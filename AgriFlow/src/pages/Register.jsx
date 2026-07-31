import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Link,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';

import HeroSection from '../components/HeroSection';
import PasswordStrength from '../components/PasswordStrength';
import { useAuth } from '../context/AuthContext';

const DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

const Register = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [termsOpen, setTermsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      phoneNumber: '',
      district: '',
      state: 'Kerala',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
    mode: 'onTouched',
  });

  const password = watch('password', '');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const authRes = await registerUser(data);
      if (!authRes.success) {
        if (authRes.errors && typeof authRes.errors === 'object') {
          Object.keys(authRes.errors).forEach((field) => {
            const val = authRes.errors[field];
            const msg = Array.isArray(val) ? val[0] : val;
            setError(field, { type: 'server', message: msg });
          });
        }
        setToast({ open: true, message: authRes.error || 'Registration failed', severity: 'error' });
        setLoading(false);
        return;
      }

      setToast({
        open: true,
        message: 'Account created successfully! You can now log in with your username.',
        severity: 'success',
      });
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setToast({ open: true, message: 'Something went wrong. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        background: `linear-gradient(180deg, rgba(15, 35, 17, 0.75) 0%, rgba(20, 50, 24, 0.85) 100%), url("/irrigation-hero.jpg") center/cover fixed`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'hidden',
      }}
    >
      <Grid container sx={{ minHeight: '100vh', width: '100%' }}>
        {/* Left Telemetry Hero Section */}
        <Grid item xs={12} md={7} lg={7.5}>
          <HeroSection />
        </Grid>

        {/* Right Glassmorphism Registration Form */}
        <Grid
          item
          xs={12}
          md={5}
          lg={4.5}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            p: { xs: 2.5, sm: 4 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              p: { xs: 3, sm: 4 },
              borderRadius: '28px',
              bgcolor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: '#1E293B' }}>
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your details to register as a farmer.
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    placeholder="e.g. Ramesh Kumar"
                    error={Boolean(errors.fullName)}
                    helperText={errors.fullName?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    {...register('fullName', {
                      required: 'Full name is required',
                      minLength: { value: 3, message: 'At least 3 characters required' },
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    placeholder="e.g. ramesh_k"
                    error={Boolean(errors.username)}
                    helperText={errors.username?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircleOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    {...register('username', {
                      required: 'Username is required',
                      minLength: { value: 3, message: 'At least 3 characters required' },
                      pattern: {
                        value: /^[a-zA-Z0-9_-]+$/,
                        message: 'Only letters, numbers, _, and - allowed',
                      },
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    placeholder="farmer@agriflow.in"
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    placeholder="9876543210"
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    {...register('phoneNumber', {
                      required: 'Phone number is required',
                      pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit number' },
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="district"
                    control={control}
                    rules={{ required: 'Select a district' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="District"
                        error={Boolean(errors.district)}
                        helperText={errors.district?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnOutlinedIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select District
                        </MenuItem>
                        {DISTRICTS.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="State"
                    disabled
                    value="Kerala"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MapOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters required' },
                    })}
                  />
                  <PasswordStrength password={password} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small">
                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    {...register('confirmPassword', {
                      required: 'Please confirm password',
                      validate: (val) => val === password || 'Passwords do not match',
                    })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        color="primary"
                        {...register('termsAccepted', { required: 'You must accept the terms' })}
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        I agree to the{' '}
                        <Link
                          component="button"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsOpen(true);
                          }}
                          color="primary"
                          underline="hover"
                          sx={{ fontWeight: 600, cursor: 'pointer', verticalAlign: 'baseline' }}
                        >
                          Terms & Conditions
                        </Link>
                      </Typography>
                    }
                  />
                  {errors.termsAccepted && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', ml: 1 }}>
                      {errors.termsAccepted.message}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ py: 1.5, borderRadius: '12px', fontSize: '1rem', fontWeight: 700 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                  </Button>
                </Grid>
              </Grid>
            </form>

            <Divider sx={{ my: 2.5 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" color="primary" underline="hover" sx={{ fontWeight: 700 }}>
                  Log in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Terms & Conditions Dialog */}
      <Dialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', p: 1 },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
            AgriFlow AI — Terms & Conditions
          </Typography>
          <IconButton onClick={() => setTermsOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ color: '#334155', lineHeight: 1.7 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#166534' }}>
            1. Introduction & Acceptance
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Welcome to AgriFlow AI. By creating an account, you agree to follow these Terms & Conditions. AgriFlow AI provides smart irrigation management, real-time soil telemetry monitoring, and AI advisory services for farmers across Kerala.
          </Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#166534' }}>
            2. Account Registration & Security
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Farmers must provide true and accurate information during registration, including full name, username, email, phone number, and district. You are responsible for safeguarding your account credentials.
          </Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#166534' }}>
            3. Smart Irrigation & Automation Services
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            AgriFlow AI automated valves and recommendations depend on sensor data. While our platform strives for 99.9% uptime, automated irrigation controls should be reviewed periodically during extreme weather events.
          </Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#166534' }}>
            4. Privacy & Data Protection
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your farm data and contact information will be securely processed and used solely for monitoring crop health, optimizing water usage, and enabling Kerala Agriculture Department field support.
          </Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#166534' }}>
            5. Contact & Support
          </Typography>
          <Typography variant="body2">
            For support or queries regarding these terms, please contact support@agriflow.in or visit your local agricultural extension office.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setTermsOpen(false)}
            sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}
          >
            I Understand & Agree
          </Button>
        </DialogActions>
      </Dialog>

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

export default Register;
