import React from 'react';
import { Box, Typography, Stack, Paper, Avatar, Chip } from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const HeroSection = () => {
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: { md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: { xs: 3.5, sm: 4, md: 5 },
        color: '#ffffff',
      }}
    >
      {/* Brand Header */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar sx={{ bgcolor: '#ffffff', color: '#2E7D32', width: 48, height: 48, boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
          <AgricultureIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', lineHeight: 1.2, letterSpacing: '0.5px' }}>
            AgriFlow <span style={{ color: '#81C784' }}>AI</span>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.78rem' }}>
            Next-Gen Smart Farming
          </Typography>
        </Box>
      </Stack>

      {/* Center Hero Text */}
      <Box sx={{ my: { xs: 4, md: 'auto' } }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 2, color: '#ffffff', fontSize: { xs: '1.85rem', sm: '2.2rem', md: '2.4rem' }, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
        >
          Welcome to AgriFlow AI
        </Typography>

        <Typography
          variant="body1"
          sx={{ opacity: 0.92, lineHeight: 1.7, mb: 4, fontSize: { xs: '0.95rem', md: '1.05rem' }, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
        >
          Create your farmer account to manage irrigation, monitor fields, and receive AI-powered recommendations.
        </Typography>

        {/* Feature Cards */}
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.25s ease',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.22)', transform: 'translateY(-2px)' },
            }}
          >
            <Avatar sx={{ bgcolor: 'rgba(129, 199, 132, 0.35)', color: '#ffffff', width: 40, height: 40 }}>
              <WaterDropIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                Smart Drip Irrigation Control
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.78rem' }}>
                Automated water valves based on real-time soil moisture
              </Typography>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.25s ease',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.22)', transform: 'translateY(-2px)' },
            }}
          >
            <Avatar sx={{ bgcolor: 'rgba(129, 199, 132, 0.35)', color: '#ffffff', width: 40, height: 40 }}>
              <PsychologyIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                AI Crop & Soil Advisory
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.78rem' }}>
                Instant pest diagnostics & personalised fertilizer schedule
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </Box>

      {/* Footer Trust Badges */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          icon={<VerifiedUserIcon style={{ color: '#81C784', fontSize: 16 }} />}
          label="Kerala Agriculture Dept Integrated"
          size="small"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '0.75rem',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        />
        <Chip
          icon={<TrendingUpIcon style={{ color: '#81C784', fontSize: 16 }} />}
          label="50,000+ Farmers Enrolled"
          size="small"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '0.75rem',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        />
      </Stack>
    </Box>
  );
};

export default HeroSection;
