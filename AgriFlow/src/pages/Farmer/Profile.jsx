import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, TextField, Button, Alert, Snackbar } from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getUserProfile, updateUserProfile } from '../../services/api';

const Profile = () => {
  const [profile, setProfile] = useState({
    username: '', full_name: '', email: '', phone_number: '', district: '', state: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      showMessage('error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(profile);
      showMessage('success', 'Profile updated successfully.');
    } catch (err) {
      showMessage('error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  return (
    <DashboardLayout title="My Profile">
      <Card elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: 800 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
          Profile Information
        </Typography>
        
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Username" name="username" value={profile.username || ''} disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" name="email" value={profile.email || ''} type="email" disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" name="full_name" value={profile.full_name || ''} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone Number" name="phone_number" value={profile.phone_number || ''} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="District" name="district" value={profile.district || ''} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="State" name="state" value={profile.state || ''} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Profile'}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Card>
      
      <Snackbar open={!!message.text} autoHideDuration={4000} onClose={() => setMessage({ type: '', text: '' })}>
        <Alert severity={message.type || 'info'} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default Profile;
