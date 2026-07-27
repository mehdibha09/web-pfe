import { Box, Card, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../../components/MyCustomButton';

const ForbiddenPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)'
            }}
        >
            <Card
                sx={{
                    width: '100%',
                    maxWidth: 560,
                    borderRadius: 3
                }}
            >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#e91e63', mb: 1 }}>
                        403
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                        {t('errors.forbidden.title')}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                        {t('errors.forbidden.message')}
                    </Typography>
                    <Button type="button" onClick={() => navigate('/profile')}>
                        {t('errors.forbidden.backToProfile')}
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ForbiddenPage;
