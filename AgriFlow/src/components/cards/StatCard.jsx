import React from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';

const StatCard = ({ title, value, subtitle, icon, color = '#2E7D32', bgColor }) => {
  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
      }}
    >
      <Avatar sx={{ bgcolor: bgColor || `${color}15`, color, width: 52, height: 52 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mt: 0.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Card>
  );
};

export default StatCard;
