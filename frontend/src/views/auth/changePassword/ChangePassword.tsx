import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const onSubmit = (values: ChangePasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      setError('confirmPassword', {
        type: 'validate',
        message: 'Passwords do not match',
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success('Change password UI completed (API integration later)');
      reset();
      setLoading(false);
    }, 500);
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
          Change Password
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          label="Current Password"
          type="password"
          {...register('currentPassword', { required: 'Current password is required' })}
          error={!!errors.currentPassword}
          helperText={errors.currentPassword?.message}
        />
        <TextField
          fullWidth
          margin="normal"
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
          fullWidth
          margin="normal"
          label="Confirm Password"
          type="password"
          {...register('confirmPassword', { required: 'Please confirm password' })}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Box>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            sx={{ mt: 2, px: 3, alignSelf: 'flex-end' }}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChangePassword;
