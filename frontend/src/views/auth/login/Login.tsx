import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import { login } from '../../../services/authService';
import { saveSession, setPendingTwoFactorSession } from '../../../services/core/authStorage';
import { C } from '../../../theme/tokens';

type LoginForm = {
    email: string;
    password: string;
};

const BRAND_GRADIENT = `linear-gradient(135deg, ${C.brand} 0%, ${C.brandDark} 100%)`;

const Login = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginForm>();
    const navigate = useNavigate();

    const handleLogin = async (input: LoginForm) => {
        const normalizedEmail = input.email.trim().toLowerCase();
        setLoading(true);
        try {
            const response = await login({
                email: normalizedEmail,
                password: input.password
            });

            if (response.twoFaRequired) {
                setPendingTwoFactorSession({ email: normalizedEmail });
                toast.info(response.message || t('auth.verificationCodeSent'));
                navigate('/two-fa');
                return;
            }

            if (!response.me) {
                throw new Error(t('auth.missingTokens'));
            }

            saveSession(response.me);
            toast.success(t('auth.loginSuccess'));
            navigate('/admin/dashboard');
        } catch (error: any) {
            const serverMsg = error?.response?.data?.message || '';
            const enToFr: Record<string, string> = {
                'Invalid credentials': t('auth.invalidCredentials'),
                'User is inactive': t('auth.userInactive')
            };
            const message = enToFr[serverMsg] || serverMsg || error?.message || t('auth.loginFailed');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            {/* Brand panel — desktop only */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    px: 6,
                    color: '#FFFFFF',
                    position: 'relative',
                    overflow: 'hidden',
                    background: BRAND_GRADIENT
                }}
            >
                <Box
                    sx={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.35)'
                    }}
                >
                    <CloudQueueIcon sx={{ fontSize: 52, color: '#FFFFFF' }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
                    Auth Console
                </Typography>
                <Typography sx={{ maxWidth: 380, textAlign: 'center', opacity: 0.9, fontSize: 15, lineHeight: 1.6 }}>
                    {t('appBar.subtitle')}
                </Typography>
            </Box>
            {/* Form panel */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.surface,
                    px: { xs: 2.5, sm: 4 },
                    py: 4
                }}
            >
                <Card sx={{ width: '100%', maxWidth: 420 }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: BRAND_GRADIENT,
                                mb: 2.5
                            }}
                        >
                            <LockOutlinedIcon sx={{ color: '#FFFFFF' }} />
                        </Box>

                        <Typography variant="h4" sx={{ fontWeight: 800, color: C.text }}>
                            {t('auth.welcomeBack')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>
                            {t('auth.signIn')}
                        </Typography>

                        <TextField
                            fullWidth
                            variant="outlined"
                            label={t('auth.email')}
                            sx={{ mb: 2.5 }}
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
                        />
                        <TextField
                            fullWidth
                            label={t('auth.password')}
                            variant="outlined"
                            type="password"
                            sx={{ mb: 3 }}
                            // TEMP: password validation disabled for testing — re-enable before prod
                            // NOTE 2026: la politique stricte (min 8 + complexité) est VOLONTAIREMENT
                            // commentée côté client car le compte de démo 'superadmin@gmail.com' utilise
                            // un mot de passe court ('test') et le backend n'applique aucune politique.
                            // Réactiver cette validation IMPOSE de renforcer le mot de passe de prod d'abord.
                            {...register('password', { required: t('validation.passwordRequired') })}
                            placeholder={t('auth.password')}
                            error={!!errors.password}
                            helperText={errors.password?.message}
                        />

                        <Button
                            disabled={loading}
                            sx={{ width: '100%', py: 1.25 }}
                            onClick={handleSubmit(handleLogin)}
                        >
                            {loading ? t('common.loading') : t('auth.login')}
                        </Button>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Typography
                                variant="body2"
                                component={Link}
                                to="/forgetPassword"
                                sx={{ color: C.brand, fontWeight: 600, textDecoration: 'none' }}
                            >
                                {t('auth.forgotPassword')}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Login;
