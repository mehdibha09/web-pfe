import { Box, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import { verifyEmailTwoFa } from '../../../services/authService';
import { clearPendingTwoFactorSession, getPendingTwoFactorSession, saveSession } from '../../../services/authStorage';

const TwoFactor = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationSucceeded, setVerificationSucceeded] = useState(false);
    const [pendingSession] = useState(() => getPendingTwoFactorSession());

    useEffect(() => {
        if (!pendingSession && !verificationSucceeded) {
            navigate('/login', { replace: true });
        }
    }, [navigate, pendingSession, verificationSucceeded]);

    const handleVerify = async () => {
        if (!pendingSession || !pendingSession.email) {
            navigate('/login', { replace: true });
            return;
        }

        const normalizedEmail = pendingSession.email.trim().toLowerCase();
        if (!normalizedEmail) {
            toast.error(t('auth.missingVerificationEmail'));
            navigate('/login', { replace: true });
            return;
        }

        const trimmedCode = code.trim();
        if (!/^\d{6}$/.test(trimmedCode)) {
            toast.error(t('auth.invalidVerificationCode'));
            return;
        }

        setLoading(true);
        try {
            const response = await verifyEmailTwoFa({
                email: normalizedEmail,
                code: trimmedCode
            });

            if (!response.tokens) {
                throw new Error(t('auth.missingTokens'));
            }

            setVerificationSucceeded(true);
            clearPendingTwoFactorSession();
            saveSession(response.tokens.accessToken, response.tokens.refreshToken, response.me);
            toast.success(response.message || t('auth.loginSuccess'));
            navigate('/admin/dashboard', { replace: true });
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('auth.verificationFailed');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        clearPendingTwoFactorSession();
        navigate('/login', { replace: true });
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
                    {t('auth.emailVerification')}
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    {t('auth.verificationCodeSentTo', { email: pendingSession?.email || t('auth.yourEmail') })}
                </Typography>
                <TextField
                    label={t('auth.verificationCode')}
                    fullWidth
                    margin="normal"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 6 } }}
                />
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button onClick={handleVerify} disabled={loading}>
                        {loading ? t('auth.verifying') : t('auth.verify')}
                    </Button>
                    <Button onClick={handleCancel}>{t('common.cancel')}</Button>
                </Box>
            </Box>
        </Box>
    );
};

export default TwoFactor;
