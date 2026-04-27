import { Box, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import { verifyEmailTwoFa } from '../../../services/authService';
import {
  clearPendingTwoFactorSession,
  getPendingTwoFactorSession,
  saveSession,
} from '../../../services/authStorage';

const TwoFactor = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSucceeded, setVerificationSucceeded] = useState(false);
  const [pendingSession] = useState(() => getPendingTwoFactorSession());

  useEffect(() => {
    if (!pendingSession && !verificationSucceeded) {
      navigate('/login', { replace: true });
    }
  }, [navigate, pendingSession, verificationSucceeded]);

  const handleVerify = async () => {
    if (!pendingSession || !pendingSession.email) {
      navigate('/login', { replace: true });
      return;
    }

    const normalizedEmail = pendingSession.email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Missing verification email. Please login again.');
      navigate('/login', { replace: true });
      return;
    }

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      toast.error('Enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmailTwoFa({
        email: normalizedEmail,
        code: trimmedCode,
      });

      if (!response.tokens) {
        throw new Error('Missing authentication tokens');
      }

      setVerificationSucceeded(true);
      clearPendingTwoFactorSession();
      saveSession(response.tokens.accessToken, response.tokens.refreshToken, response.me);
      toast.success(response.message || 'Login successful');
      navigate('/profile', { replace: true });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Verification failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    clearPendingTwoFactorSession();
    navigate('/login', { replace: true });
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
          Email verification
        </Typography>
        <Typography sx={{ mb: 2 }}>
          We sent a 6-digit verification code to {pendingSession?.email || 'your email'}.
        </Typography>
        <TextField
          label="Verification Code"
          fullWidth
          margin="normal"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 6 } }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button onClick={handleCancel}>Cancel</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TwoFactor;
