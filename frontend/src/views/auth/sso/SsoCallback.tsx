import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import { saveSession } from '../../../services/authStorage';
import axiosInstance from '../../../services/axiosInstance';

const SsoCallback = () => {
    const { t } = useTranslation();
    const { provider } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const code = searchParams.get('code') || '';
    const state = searchParams.get('state') || '';

    const isValid = useMemo(() => Boolean(provider && code), [provider, code]);

    const finishLogin = async () => {
        try {
            const { data } = await axiosInstance.post('/auth/sso/callback', {
                provider,
                code,
                state,
            });
            if (data.tokens) {
                saveSession(data.tokens.accessToken, data.tokens.refreshToken, data.me);
                toast.success(t('auth.ssoLoginSuccess'));
                navigate('/admin/dashboard');
            } else if (data.twoFaRequired) {
                toast.info(data.message || t('auth.twoFactorRequired'));
                navigate('/two-fa');
            } else {
                toast.error(t('auth.ssoLoginFailedMissingTokens'));
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || t('auth.ssoLoginFailed');
            toast.error(message);
        }
    };

    return (
        <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '40%', minWidth: '320px', p: 4, borderRadius: '10px', backgroundColor: 'white', boxShadow: 20 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>{t('auth.ssoCallback')}</Typography>
                <Typography><strong>{t('auth.provider')}:</strong> {provider || '-'}</Typography>
                <Typography><strong>{t('auth.code')}:</strong> {code ? `${code.substring(0, 8)}...` : '-'}</Typography>
                <Typography sx={{ mb: 2 }}><strong>{t('auth.state')}:</strong> {state || '-'}</Typography>
                <Button onClick={finishLogin} disabled={!isValid} sx={{ width: '100%' }}>
                    {t('auth.continueWithSso')}
                </Button>
            </Box>
        </Box>
    );
};

export default SsoCallback;
