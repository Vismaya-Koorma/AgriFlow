import React from 'react';
import { Box, Typography, LinearProgress, Stack, Collapse } from '@mui/material';

export const getPasswordCriteria = (password = '') => {
  return [
    { label: 'Minimum 8 characters', satisfied: password.length >= 8 },
    { label: 'At least 1 uppercase letter (A-Z)', satisfied: /[A-Z]/.test(password) },
    { label: 'At least 1 lowercase letter (a-z)', satisfied: /[a-z]/.test(password) },
    { label: 'At least 1 number (0-9)', satisfied: /[0-9]/.test(password) },
    { label: 'At least 1 special character (@, #, $, %, !, etc.)', satisfied: /[^a-zA-Z0-9]/.test(password) },
  ];
};

export const getStrengthScore = (password = '') => {
  const criteria = getPasswordCriteria(password);
  const count = criteria.filter((c) => c.satisfied).length;
  if (count <= 2) return { label: 'Weak', color: '#ef4444', value: 33, count };
  if (count <= 4) return { label: 'Medium', color: '#f59e0b', value: 66, count };
  return { label: 'Strong', color: '#22c55e', value: 100, count };
};

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const criteria = getPasswordCriteria(password);
  const { label, color, value, count } = getStrengthScore(password);
  const isAllSatisfied = count === 5;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Password strength
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color }}>
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
          mb: isAllSatisfied ? 0 : 1,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />

      <Collapse in={!isAllSatisfied} timeout="auto">
        <Stack spacing={0.6} sx={{ pt: 0.5 }}>
          {criteria.map((item, idx) => (
            <Stack key={idx} direction="row" alignItems="center" spacing={0.8}>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: item.satisfied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                  color: item.satisfied ? '#22c55e' : '#ef4444',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                }}
              >
                {item.satisfied ? '✓' : '✗'}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: item.satisfied ? '#166534' : '#64748b',
                  fontWeight: item.satisfied ? 600 : 400,
                  fontSize: '0.75rem',
                }}
              >
                {item.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default PasswordStrength;
