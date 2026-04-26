import { Box, Card, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Button from '../../component/MyCustomButton';

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: 'linear-gradient(180deg, #FFFDFE 0%, #FFF5F9 100%)',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          border: '1px solid #f8bbd0',
          boxShadow: '0 8px 24px rgba(240, 98, 146, 0.18)',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#e91e63', mb: 1 }}>
            403
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Access denied
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            You do not have permission to access this page.
          </Typography>
          <Button type="button" onClick={() => navigate('/profile')}>
            Back to profile
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForbiddenPage;
