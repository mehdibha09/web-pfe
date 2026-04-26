import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';

const TwoFactor = () => {
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetup = () => {
    setLoading(true);
    setTimeout(() => {
      toast.success('2FA setup UI completed (API integration later)');
      setLoading(false);
    }, 400);
  };

  const handleVerify = () => {
    if (!code.trim()) {
      toast.error('Enter verification code');
      return;
    }
    setEnabled(true);
    toast.success('2FA verified locally');
    setCode('');
  };

  const handleDisable = () => {
    setEnabled(false);
    toast.success('2FA disabled locally');
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: '34%',
          minWidth: '320px',
          p: 4,
          borderRadius: '10px',
          backgroundColor: 'white',
          boxShadow: 20,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Two-Factor Authentication
        </Typography>
        <Typography sx={{ mb: 2 }}>Status: {enabled ? 'Enabled' : 'Disabled'}</Typography>
        <Button onClick={handleSetup} disabled={loading} sx={{ mb: 2 }}>
          {loading ? 'Preparing...' : 'Setup 2FA'}
        </Button>
        <TextField
          label="Verification Code"
          fullWidth
          margin="normal"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button onClick={handleVerify}>Verify</Button>
          <Button onClick={handleDisable} disabled={!enabled}>
            Disable
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TwoFactor;
