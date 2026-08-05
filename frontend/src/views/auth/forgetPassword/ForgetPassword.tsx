import { Alert, Box, CircularProgress, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import Button from '../../../components/MyCustomButton';
import { forgotPassword } from '../../../services/authService';
import { C } from '../../../theme/tokens';

type ForgotPasswordForm = {
    email: string;
};

const ForgetPassword = () => {
    const { t } = useTranslation();
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<ForgotPasswordForm>();
    const [loading, setLoading] = useState(false);
    const [sentEmail, setSentEmail] = useState<string | null>(null);

    const handleForgotPassword = async (data: ForgotPasswordForm) => {
        setLoading(true);
        try {
            await forgotPassword({ email: data.email });
            toast.success(t('auth.resetLinkSent'));
            setSentEmail(data.email);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('auth.emailNotSent');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(160deg, #FDFCFF 0%, #F5F0FA 50%, #F8F5FA 100%)',
                p: 2
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 440,
                    maxWidth: '100%',
                    padding: '2.5rem 2rem',
                    borderRadius: '16px',
                    backgroundColor: 'white',
                    boxShadow: '0 12px 40px rgba(124, 58, 237, 0.12)',
                    border: `1px solid ${C.border}`
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        boxShadow: '0 6px 18px rgba(124, 58, 237, 0.35)'
                    }}
                >
                    {sentEmail ? (
                        <MarkEmailReadOutlinedIcon sx={{ color: '#fff', fontSize: 32 }} />
                    ) : (
                        <MailOutlineIcon sx={{ color: '#fff', fontSize: 32 }} />
                    )}
                </Box>

                {sentEmail ? (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, mb: 1, textAlign: 'center' }}>
                            {t('auth.forgotPasswordTitle')}
                        </Typography>
                        <Alert
                            severity="success"
                            sx={{ width: '100%', mb: 2, borderRadius: 2, bgcolor: '#EAF7F0', '& .MuiAlert-icon': { color: '#10B981' } }}
                        >
                            {t('auth.resetLinkSent')}
                        </Alert>
                        <Typography sx={{ color: C.muted, textAlign: 'center', fontSize: 14 }}>
                            {t('auth.forgotPasswordDesc')}
                        </Typography>
                        <Button
                            onClick={() => setSentEmail(null)}
                            sx={{
                                my: 2,
                                padding: '0.6rem 2.5rem',
                                borderRadius: '10px',
                                fontWeight: 700,
                                color: '#fff',
                                background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                                boxShadow: '0 6px 18px rgba(124, 58, 237, 0.35)',
                                '&:hover': { opacity: 0.92 }
                            }}
                        >
                            {t('auth.sendResetLink')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, mb: 1, textAlign: 'center' }}>
                            {t('auth.forgotPasswordTitle')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mb: 2, textAlign: 'center' }}>
                            {t('auth.forgotPasswordDesc')}
                        </Typography>
                        <TextField
                            label={t('auth.email')}
                            type="email"
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            id="forgot-password-email"
                            {...register('email', {
                                required: t('validation.emailRequired'),
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: t('validation.invalidEmail')
                                }
                            })}
                            placeholder={t('auth.email')}
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handleSubmit(handleForgotPassword)();
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': { borderColor: C.brand }
                                },
                                '& label.Mui-focused': { color: C.brand }
                            }}
                        />
                        <Button
                            onClick={handleSubmit(handleForgotPassword)}
                            disabled={loading}
                            sx={{
                                my: 2,
                                width: '100%',
                                padding: '0.7rem',
                                fontSize: 15,
                                fontWeight: 700,
                                borderRadius: '10px'
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={18} sx={{ color: '#fff' }} />
                            ) : (
                                t('auth.sendResetLink')
                            )}
                        </Button>
                    </>
                )}

                <Typography
                    variant="body2"
                    component={Link}
                    to="/login"
                    sx={{ color: C.brand, textDecoration: 'none', mt: 1 }}
                >
                    {t('auth.backToLogin')}
                </Typography>
            </Box>
        </Box>
    );
};

export default ForgetPassword;
