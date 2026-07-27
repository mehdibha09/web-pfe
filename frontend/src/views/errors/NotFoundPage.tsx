import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../../components/MyCustomButton';
import { BTN, C} from '../../theme/tokens';

export default function NotFoundPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h1" sx={{ fontSize: 120, fontWeight: 900, color: C.brand, lineHeight: 1 }}>404</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>{t('errors.notFound.title')}</Typography>
            <Typography sx={{ color: C.muted, mb: 3 }}>{t('errors.notFound.message')}</Typography>
            <Button onClick={() => navigate('/login', { replace: true })} sx={{ background: BTN.primary.gradient, textTransform: 'none', px: 4 }}>
                {t('errors.notFound.backToHome')}
            </Button>
        </Box>
    );
}
