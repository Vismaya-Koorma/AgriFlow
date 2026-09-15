import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Grid, Typography, TextField, Button, InputAdornment,
  IconButton, Alert, CircularProgress, Link, Divider,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth, ROLE_PATHS } from '../context/AuthContext';
import HeroSection from '../components/HeroSection';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);

    try {
      const result = await login(data.username.trim(), data.password);
      if (result.success) {
        navigate(ROLE_PATHS[result.user?.role] || '/farmer');
      } else {
        if (result.errors && typeof result.errors === 'object') {
          Object.keys(result.errors).forEach((field) => {
            const val = result.errors[field];
            const msg = Array.isArray(val) ? val[0] : val;
            if (field === 'username' || field === 'email') {
              setError('username', { type: 'server', message: msg });
            } else if (field === 'password') {
              setError('password', { type: 'server', message: msg });
            } else {
              setServerError(msg);
            }
          });
        } else {
          setServerError(result.error || 'Invalid email or password.');
        }
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
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
      }}
    >
      <Grid container sx={{ minHeight: '100vh', width: '100%' }}>
        {/* Left Hero */}
        <Grid item xs={12} md={7} lg={7.5}>
          <HeroSection />
        </Grid>

        {/* Right Login Card */}
        <Grid item xs={12} md={5} lg={4.5} sx={{ display: 'flex', alignItems: 'center', p: { xs: 2.5, sm: 4 } }}>
          <Box
            sx={{
              width: '100%',
              p: { xs: 3, sm: 4 },
              borderRadius: '28px',
              bgcolor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                component="img"
                src="/agriflow-logo.jpg"
                alt="AgriFlow AI Logo"
                sx={{ width: 42, height: 42, borderRadius: '10px', boxShadow: '0 4px 12px rgba(46,125,50,0.3)', border: '2px solid #2E7D32' }}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
                AgriFlow <span style={{ color: '#2E7D32' }}>AI</span>
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your credentials to access your dashboard.
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Username or Email"
                  placeholder="e.g. farmer or user@example.com"
                  error={Boolean(errors.username)}
                  helperText={errors.username?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  {...register('username', {
                    validate: (value) => {
                      if (!value || !value.trim()) {
                        return 'This field is required.';
                      }
                      const val = value.trim();
                      if (val.includes('@')) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(val)) {
                          return 'Please enter a valid email address.';
                        }
                      }
                      return true;
                    },
                  })}
                />

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
                    validate: (value) => {
                      if (!value) {
                        return 'Password is required.';
                      }
                      return true;
                    },
                  })}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '1rem' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>
            </form>

            <Box sx={{ textAlign: 'center', mt: 2.5, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                New Farmer?{' '}
                <Link component={RouterLink} to="/register" color="primary" underline="hover" sx={{ fontWeight: 700 }}>
                  Create an Account / Register
                </Link>
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;
