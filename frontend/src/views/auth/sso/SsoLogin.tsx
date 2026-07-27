import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import axiosInstance from '../../../services/axiosInstance';

const SsoLogin = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

    const handleProvider = async (provider: string) => {
        setLoadingProvider(provider);
        try {
            const { data } = await axiosInstance.get(`/auth/sso/${provider}/redirect`);
            if (data?.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                toast.error(t('auth.ssoRedirectUrlMissing'));
                setLoadingProvider(null);
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || t('auth.ssoLoginFailed');
            toast.error(message);
            setLoadingProvider(null);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Box
                sx={{
                    width: '34%',
                    minWidth: '320px',
                    p: 4,
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    boxShadow: 20
                }}
            >
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {t('auth.ssoLogin')}
                </Typography>
                <Typography sx={{ mb: 2 }}>{t('auth.chooseProvider')}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button onClick={() => handleProvider('google')} disabled={loadingProvider !== null}>
                        {loadingProvider === 'google' ? t('auth.redirecting') : t('auth.providerGoogle')}
                    </Button>
                    <Button onClick={() => handleProvider('github')} disabled={loadingProvider !== null}>
                        {loadingProvider === 'github' ? t('auth.redirecting') : t('auth.providerGithub')}
                    </Button>
                    <Button onClick={() => handleProvider('microsoft')} disabled={loadingProvider !== null}>
                        {loadingProvider === 'microsoft' ? t('auth.redirecting') : t('auth.providerMicrosoft')}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default SsoLogin;
