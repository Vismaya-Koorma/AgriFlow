import React, { useState, useEffect } from 'react';
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
import { getGoogleAuthUrl, API_BASE_URL } from '../services/api';

import HeroSection from '../components/HeroSection';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const Login = () => {
  const { login, loginWithGoogleCode } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  // Handle single-use Google exchange code or error in URL query string on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setServerError(decodeURIComponent(error));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      // Clean URL immediately so single-use code is stripped from browser history
      window.history.replaceState({}, document.title, window.location.pathname);
      setGoogleLoading(true);
      loginWithGoogleCode(code)
        .then((result) => {
          if (result.success) {
            navigate(ROLE_PATHS[result.user?.role] || '/farmer');
          } else {
            setServerError(result.error || 'Google authentication failed.');
          }
        })
        .catch(() => {
          setServerError('An unexpected error occurred during Google Sign-In.');
        })
        .finally(() => {
          setGoogleLoading(false);
        });
    }
  }, [loginWithGoogleCode, navigate]);

  const handleGoogleLogin = async () => {
    setServerError('');
    setGoogleLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      // Fallback direct backend redirect
      window.location.href = `${API_BASE_URL}/auth/google/redirect/`;

    }
  };

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
                  disabled={loading || googleLoading}
                  sx={{ py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '1rem' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 2.5, color: 'text.secondary', fontSize: '0.85rem' }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              startIcon={googleLoading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
              sx={{
                py: 1.3,
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#334155',
                borderColor: '#cbd5e1',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#94a3b8',
                  bgcolor: 'rgba(241, 245, 249, 0.6)',
                },
              }}
            >
              {googleLoading ? 'Authenticating with Google...' : 'Continue with Google'}
            </Button>

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

