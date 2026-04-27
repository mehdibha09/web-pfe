import { Box, Card, CardContent, Chip, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import {
  changePassword,
  disableTwoFa,
  getMe,
  logout,
  setupTwoFa,
  verifyTwoFa,
  type TwoFaSetupResponse,
} from '../../../services/authService';
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  isAuthenticated,
  setStoredUser,
} from '../../../services/authStorage';

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const Profile = () => {
  const [user, setUser] = useState(getStoredUser());
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [twoFaEnabled, setTwoFaEnabled] = useState(Boolean(user?.twoFaEnabled));
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetupResponse | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const me = await getMe();
        if (!mounted) {
          return;
        }
        setStoredUser(me);
        setUser(me);
        setTwoFaEnabled(Boolean(me.twoFaEnabled));
      } catch (_error) {
        if (!mounted) {
          return;
        }
        clearSession();
        navigate('/login', { replace: true });
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    const refreshToken = getRefreshToken() || undefined;

    logout(refreshToken)
      .catch(() => undefined)
      .finally(() => {
        clearSession();
        navigate('/login');
      });
  };

  const onSubmitPassword = async (values: ChangePasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      setError('confirmPassword', {
        type: 'validate',
        message: 'Passwords do not match',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated successfully');
      reset();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Change password failed';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnableTwoFa = async () => {
    setTwoFaLoading(true);
    try {
      const response = await setupTwoFa();
      setTwoFaSetup(response);
      setTwoFaCode('');
      toast.success(response.message || '2FA setup generated');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || '2FA setup failed';
      toast.error(message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyTwoFa = async () => {
    if (!twoFaSetup) {
      toast.error('Generate 2FA setup first');
      return;
    }

    const trimmedCode = twoFaCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      toast.error('Enter a valid 6-digit code');
      return;
    }

    setTwoFaLoading(true);
    try {
      const response = await verifyTwoFa({ code: trimmedCode });
      const me = await getMe();
      setStoredUser(me);
      setUser(me);
      setTwoFaEnabled(Boolean(me.twoFaEnabled));
      setTwoFaSetup(null);
      setTwoFaCode('');
      toast.success(response.message || '2FA enabled successfully');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || '2FA verification failed';
      toast.error(message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisableTwoFa = async () => {
    setTwoFaLoading(true);
    try {
      const response = await disableTwoFa();
      const me = await getMe();
      setStoredUser(me);
      setUser(me);
      setTwoFaEnabled(Boolean(me.twoFaEnabled));
      setTwoFaSetup(null);
      setTwoFaCode('');
      toast.success(response.message || '2FA disabled');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || '2FA disable failed';
      toast.error(message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography sx={{ color: '#64748B' }}>Loading profile...</Typography>
      </Box>
    );
  }

  if (!user || !isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#FFFBFD', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          My Account
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Profile details, password update and two-factor authentication in one page.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', boxShadow: 'none' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Email
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>{user.email || '-'}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', boxShadow: 'none' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Tenant
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>
              {user.tenantName || '-'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', mb: 2, boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Profile Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Status
              </Typography>
              <Chip
                label={user.status || '-'}
                size="small"
                sx={{
                  mt: 0.5,
                  backgroundColor: '#FCE7F3',
                  color: '#BE185D',
                  fontWeight: 700,
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Roles
              </Typography>
              <Typography sx={{ mt: 0.5, color: '#0F172A', fontWeight: 600 }}>
                {user.roles?.join(', ') || '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', mb: 2, boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Change Password
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' },
              gap: 2,
            }}
          >
            <TextField
              label="Current Password"
              type="password"
              {...register('currentPassword', { required: 'Current password is required' })}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
            />
            <TextField
              label="New Password"
              type="password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 4, message: 'At least 4 characters' },
              })}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
            />
            <TextField
              label="Confirm Password"
              type="password"
              {...register('confirmPassword', { required: 'Please confirm password' })}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button onClick={handleSubmit(onSubmitPassword)} disabled={passwordLoading}>
                {passwordLoading ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Two-Factor Authentication
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Status:
            </Typography>
            <Chip
              label={twoFaEnabled ? 'Email code enabled' : 'Disabled'}
              size="small"
              sx={{
                backgroundColor: twoFaEnabled ? '#FCE7F3' : '#FFF1F6',
                color: '#BE185D',
                border: '1px solid #F8CADD',
                fontWeight: 700,
              }}
            />
          </Box>
          <Typography sx={{ color: '#64748B', mb: 2 }}>
            When 2FA is enabled, a 6-digit code is sent by email each time you sign in.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Button onClick={handleEnableTwoFa} disabled={twoFaLoading}>
              {twoFaLoading ? 'Loading...' : 'Enable 2FA'}
            </Button>
            <Button onClick={handleVerifyTwoFa} disabled={twoFaLoading || !twoFaSetup}>
              Verify & Enable
            </Button>
            <Button onClick={handleDisableTwoFa} disabled={twoFaLoading || !twoFaEnabled}>
              Disable 2FA
            </Button>
          </Box>
          <TextField
            label="2FA code"
            value={twoFaCode}
            onChange={(event) => setTwoFaCode(event.target.value)}
            placeholder="123456"
            slotProps={{ htmlInput: { maxLength: 6 } }}
            sx={{ mb: 2, maxWidth: 240 }}
          />
          {twoFaSetup && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Check your email for the 6-digit activation code, then click Verify & Enable.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={handleLogout}>Logout</Button>
      </Box>
    </Box>
  );
};

export default Profile;
