import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
// import LogoAscend from '../../../assets/Logos/logofullascend_noir.svg';
import Button from '../../../component/MyCustomButton';
import { forgotPassword } from '../../../services/authService';

type ForgotPasswordForm = {
  email: string;
};

const ForgetPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (email: ForgotPasswordForm) => {
    setLoading(true);
    try {
      await forgotPassword({ email: email.email });
      toast.success('Reset link sent if the account exists');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Email not sent';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            // src={LogoAscend}
            alt="logo"
            style={{ width: '400px', height: '70px', margin: '2rem 0' }}
          />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
            Forgot Password
          </Typography>
          <Typography sx={{ color: '#64748B', mb: 2, textAlign: 'center' }}>
            Enter your email address and we will send you a secure link to reset your password.
          </Typography>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            variant="outlined"
            id="outlined-basic"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid Email',
              },
            })}
            placeholder="Email"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <Button
            onClick={handleSubmit(handleForgotPassword)}
            disabled={loading}
            sx={{
              my: 2,
              padding: '0.5rem 2rem',
              alignSelf: 'flex-end',
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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
    </>
  );
};

export default ForgetPassword;
