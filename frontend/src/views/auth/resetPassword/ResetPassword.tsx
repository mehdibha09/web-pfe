import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// import LogoAscend from '../../../assets/Logos/logofullascend_noir.svg';
import Button from '../../../component/MyCustomButton';
import { resetPassword } from '../../../services/authService';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const handleResetPassword = async (input: ResetPasswordForm) => {
    if (!token) {
      toast.error('Reset token is missing');
      return;
    }

    if (input.password !== input.confirmPassword) {
      setError('confirmPassword', {
        type: 'validate',
        message: 'Passwords do not match',
      });
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        token,
        newPassword: input.password,
      });
      toast.success('Password reset successful');
      navigate('/login');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Reset password failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '30%',
          minWidth: '360px',

          padding: '2rem',
          borderRadius: '10px',
          backgroundColor: 'white',
          boxShadow: 20,
          boxShadowColor: 'rgba(0, 0, 0, 0.35)',
        }}
      >
        <img
          //   src={LogoAscend}
          alt="logo"
          style={{ width: '400px', height: '70px', margin: '2rem 0' }}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
          Reset Password
        </Typography>
        <Typography sx={{ color: '#64748B', mb: 2, textAlign: 'center' }}>
          Choose a new password for your account.
        </Typography>
        <TextField
          label="New password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          id="outlined-basic"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 4,
              message: 'Password must be at least 4 characters',
            },
          })}
          placeholder="New password"
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <TextField
          label="Confirm password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          id="outlined-basic"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            minLength: {
              value: 4,
              message: 'Password must be at least 4 characters',
            },
          })}
          placeholder="Confirm password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Button
          onClick={handleSubmit(handleResetPassword)}
          disabled={loading}
          sx={{
            my: 2,
            padding: '0.5rem 2rem',
            alignSelf: 'flex-end',
          }}
        >
          {loading ? 'Saving...' : 'Reset Password'}
        </Button>
        <Typography
          variant="body2"
          component={Link}
          to="/login"
          sx={{ color: '#e4477d', textDecoration: 'none', mt: 1 }}
        >
          Back to Login
        </Typography>
      </Box>
    </Box>
  );
};

export default ResetPassword;
