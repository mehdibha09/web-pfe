import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../../../component/MyCustomButton';
import { saveSession } from '../../../services/authStorage';

const SsoCallback = () => {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';

  const isValid = useMemo(() => Boolean(provider && code), [provider, code]);

  const finishLogin = () => {
    saveSession('local-access-token', 'local-refresh-token', {
      userId: 'sso-local-user',
      email: 'sso.user@example.com',
      tenantId: 'local-tenant',
      tenantName: 'Local Tenant',
      status: 'ACTIVE',
      roles: ['ADMIN'],
      permissions: ['*'],
      twoFaEnabled: false,
    });
    navigate('/profile');
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
          width: '40%',
          minWidth: '320px',
          p: 4,
          borderRadius: '10px',
          backgroundColor: 'white',
          boxShadow: 20,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          SSO Callback
        </Typography>
        <Typography>
          <strong>Provider:</strong> {provider || '-'}
        </Typography>
        <Typography>
          <strong>Code:</strong> {code || '-'}
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <strong>State:</strong> {state || '-'}
        </Typography>
        <Button onClick={finishLogin} disabled={!isValid}>
          Continue to Profile
        </Button>
      </Box>
    </Box>
  );
};

export default SsoCallback;
