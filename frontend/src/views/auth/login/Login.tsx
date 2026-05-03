import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// import LogoAscend from '../../../assets/Logos/logofullascend_noir.svg';
import Button from '../../../component/MyCustomButton';
import { login } from '../../../services/authService';
import { saveSession, setPendingTwoFactorSession } from '../../../services/authStorage';
// import LoginAnimation from '../component/LoginAnimation';

type LoginForm = {
  email: string;
  password: string;
};

const Login = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();
  const navigate = useNavigate();

  const handleLogin = async (input: LoginForm) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    setLoading(true);
    try {
      const response = await login({
        email: input.email,
        password: input.password,
      });

      if (response.twoFaRequired) {
        setPendingTwoFactorSession({
          email: normalizedEmail,
        });
        toast.info(response.message || 'A verification code has been sent to your email address');
        navigate('/two-fa');
        return;
      }

      if (!response.tokens) {
        throw new Error('Missing authentication tokens');
      }

      saveSession(response.tokens.accessToken, response.tokens.refreshToken, response.me);
      toast.success('Login successful');
      navigate('/profile');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100vh',
          backgroundColor: '#e4477ec5',
          md: {
            display: 'none',
            width: '0%',
            height: '0%',
          },
          sm: {
            display: 'none',
            width: '0%',
            height: '0%',
          },
          xs: {
            display: 'none',
            width: '0%',
            height: '0%',
          },
        }}
      >
        {/* <LoginAnimation /> */}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          gap: '20px',
          backgroundColor: '#ffffff',
          height: '100vh',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 'bold',
            fontSize: '30px',
            fontFamily: 'cursive',
          }}
        >
          {/* <img src={LogoAscend} alt="logo" style={{ width: '400px', height: '70px' }} /> */}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: -1 }}>
          Welcome Back
        </Typography>
        <Typography sx={{ color: '#64748B', mb: 1 }}>
          Sign in to access your authentication dashboard.
        </Typography>

        <TextField
          variant="outlined"
          id="outlined-basic"
          label="Email"
          sx={{
            width: '50%',
          }}
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
        <TextField
          label="Password"
          variant="outlined"
          id="outlined-basic"
          type="password"
          sx={{
            width: '50%',
          }}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 4,
              message: 'Password must have at least 4 characters',
            },
          })}
          placeholder="Password"
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button
          disabled={loading}
          sx={{
            width: '50%',
            padding: '10px',
          }}
          onClick={handleSubmit(handleLogin)}
        >
          {loading ? 'Loading...' : 'Login'}
        </Button>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '50%',
          }}
        >
          <Typography
            variant="body2"
            component={Link}
            to="/forgetPassword"
            sx={{
              color: '#e4477d',
            }}
          >
            Forgot Password?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Enter your credentials to continue.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
