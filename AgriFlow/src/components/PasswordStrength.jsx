import React from 'react';
import { Box, Typography, LinearProgress, Stack } from '@mui/material';

const getStrength = (password = '') => {
  if (!password) return { label: '', color: '#e2e8f0', value: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: '#ef4444', value: 33 };
  if (score <= 4) return { label: 'Medium', color: '#f59e0b', value: 66 };
  return { label: 'Strong', color: '#22c55e', value: 100 };
};

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const { label, color, value } = getStrength(password);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Password strength
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color }}>
          {label}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: '#e2e8f0',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
};

export default PasswordStrength;
