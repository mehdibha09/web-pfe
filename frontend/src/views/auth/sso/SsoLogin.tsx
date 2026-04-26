import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';

const SsoLogin = () => {
  const navigate = useNavigate();

  const handleProvider = (provider: string) => {
    toast.success(`${provider} SSO UI completed (API integration later)`);
    navigate(`/sso/callback/${provider}?code=demo-code&state=demo-state`);
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
          SSO Login
        </Typography>
        <Typography sx={{ mb: 2 }}>Choose your provider:</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={() => handleProvider('google')}>Google</Button>
          <Button onClick={() => handleProvider('github')}>GitHub</Button>
          <Button onClick={() => handleProvider('microsoft')}>Microsoft</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SsoLogin;
