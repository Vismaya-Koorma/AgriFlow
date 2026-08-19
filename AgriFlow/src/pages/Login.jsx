import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Grid, Typography, TextField, Button, InputAdornment,
  IconButton, Alert, CircularProgress, Link, Divider,
} from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';
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
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    // small delay for UX
    await new Promise((r) => setTimeout(r, 600));
    const result = await login(form.username, form.password);
    setLoading(false);
    if (result.success) {
      navigate(ROLE_PATHS[result.user.role] || '/farmer');
    } else {
      setError(result.error);
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
                sx={{ width: 42, height: 42, borderRadius: "10px", boxShadow: "0 4px 12px rgba(46,125,50,0.3)", border: "2px solid #2E7D32" }}
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

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Username or Email"
                  name="username"
                  placeholder="e.g. farmer or your_username"
                  value={form.username}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
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
