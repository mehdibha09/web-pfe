import { Box, Card, CardContent, Chip, Divider, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
    changePassword,
    disableTwoFa,
    getBackupCodes,
    getMe,
    logout,
    regenerateBackupCodes,
    setupTwoFa,
    updateEmail,
    verifyTwoFa,
    type TwoFaSetupResponse,
    type BackupCodesResponse
} from '../../../services/authService';
import { C } from '../../../theme/tokens';
import {
    clearSession,
    getRefreshToken,
    getStoredUser,
    isAuthenticated,
    setStoredUser
} from '../../../services/authStorage';

type ChangePasswordForm = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

type UpdateEmailForm = {
    newEmail: string;
    password: string;
};

const Profile = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(getStoredUser());
    const navigate = useNavigate();
    const [profileLoading, setProfileLoading] = useState(true);
    const [twoFaEnabled, setTwoFaEnabled] = useState(Boolean(user?.twoFaEnabled));
    const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetupResponse | null>(null);
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [backupCodes, setBackupCodes] = useState<BackupCodesResponse | null>(null);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors }
    } = useForm<ChangePasswordForm>();
    const {
        register: registerEmail,
        handleSubmit: handleSubmitEmail,
        reset: resetEmail,
        formState: { errors: emailErrors }
    } = useForm<UpdateEmailForm>();

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            try {
                const me = await getMe();
                if (!mounted) {
                    return;
                }
                setStoredUser(me);
                setUser(me);
                setTwoFaEnabled(Boolean(me.twoFaEnabled));
            } catch (error) {
                if (!mounted) {
                    return;
                }
                const status = (error as { response?: { status?: number } } | null)?.response?.status;
                if (status === 401 || status === 403) {
                    clearSession();
                    navigate('/login', { replace: true });
                    return;
                }
                setUser(getStoredUser());
                toast.error((error as Error)?.message || t('profile.profileLoadFailed'));
            } finally {
                if (mounted) {
                    setProfileLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const handleLogout = () => {
        const refreshToken = getRefreshToken() || undefined;

        logout(refreshToken)
            .catch(() => undefined)
            .finally(() => {
                clearSession();
                navigate('/login');
            });
    };

    const onSubmitPassword = async (values: ChangePasswordForm) => {
        if (values.newPassword !== values.confirmPassword) {
            setError('confirmPassword', {
                type: 'validate',
                message: t('validation.passwordsDoNotMatch')
            });
            return;
        }

        setPasswordLoading(true);
        try {
            await changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            toast.success(t('profile.passwordUpdated'));
            reset();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.passwordChangeFailed');
            toast.error(message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const onSubmitEmail = async (values: UpdateEmailForm) => {
        setEmailLoading(true);
        try {
            await updateEmail({
                newEmail: values.newEmail.trim(),
                password: values.password
            });
            const me = await getMe();
            setStoredUser(me);
            setUser(me);
            toast.success(t('profile.emailUpdated'));
            resetEmail();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.emailUpdateFailed');
            toast.error(message);
        } finally {
            setEmailLoading(false);
        }
    };

    const handleEnableTwoFa = async () => {
        setTwoFaLoading(true);
        try {
            const response = await setupTwoFa();
            setTwoFaSetup(response);
            setTwoFaCode('');
            setBackupCodes(null);
            setShowBackupCodes(false);
            toast.success(response.message || t('profile.twoFaSetupSuccess'));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.twoFaSetupFailed');
            toast.error(message);
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handleVerifyTwoFa = async () => {
        if (!twoFaSetup) {
            toast.error(t('profile.generateSetupFirst'));
            return;
        }

        const trimmedCode = twoFaCode.trim();
        if (!/^\d{6}$/.test(trimmedCode)) {
            toast.error(t('validation.invalidCode'));
            return;
        }

        setTwoFaLoading(true);
        try {
            const response = await verifyTwoFa({ code: trimmedCode });
            const me = await getMe();
            setStoredUser(me);
            setUser(me);
            setTwoFaEnabled(Boolean(me.twoFaEnabled));
            setTwoFaSetup(null);
            setTwoFaCode('');
            toast.success(response.message || t('profile.twoFaEnabledSuccess'));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.twoFaVerificationFailed');
            toast.error(message);
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handleDisableTwoFa = async () => {
        setTwoFaLoading(true);
        try {
            const response = await disableTwoFa();
            const me = await getMe();
            setStoredUser(me);
            setUser(me);
            setTwoFaEnabled(Boolean(me.twoFaEnabled));
            setTwoFaSetup(null);
            setTwoFaCode('');
            setBackupCodes(null);
            setShowBackupCodes(false);
            toast.success(response.message || t('profile.twoFaDisabled'));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.twoFaDisableFailed');
            toast.error(message);
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handleShowBackupCodes = async () => {
        try {
            const response = await getBackupCodes();
            setBackupCodes(response);
            setShowBackupCodes(true);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.backupCodesFailed');
            toast.error(message);
        }
    };

    const handleRegenerateBackupCodes = async () => {
        try {
            const response = await regenerateBackupCodes();
            setBackupCodes(response);
            toast.success(t('profile.backupCodesGenerated'));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('profile.backupCodesRegenerateFailed');
            toast.error(message);
        }
    };

    if (profileLoading) {
        return <LoadingSpinner variant="page" />;
    }

    if (!user || !isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    const statusColor = (s: string) => {
        const up = s?.toUpperCase();
        if (up === 'ACTIVE') return { bg: '#E0F1E6', fg: '#2E7A4F' };
        if (up === 'INVITED') return { bg: '#E4EEF7', fg: '#2E5C8A' };
        return { bg: '#F3F4F6', fg: '#6B7280' };
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(160deg, #FAF8FF 0%, #F5F0FA 50%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Box sx={{ width: 3, height: 28, borderRadius: 2, backgroundColor: C.brand }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
                        {t('profile.title')}
                    </Typography>
                </Box>
                <Typography sx={{ color: C.muted, ml: 4.5 }}>
                    {t('profile.subtitle')}
                </Typography>
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 2, background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8FA 100%)', position: 'relative', overflow: 'visible' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: 3, background: `linear-gradient(135deg, ${C.brandLight} 0%, #F0E6FF 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PersonOutlinedIcon sx={{ color: C.brand, fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {user.email || '-'}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            <Chip label={user.status || '-'} size="small" sx={{ backgroundColor: statusColor(user.status || '').bg, color: statusColor(user.status || '').fg, fontWeight: 700, fontSize: 10, height: 22 }} />
                            <Chip label={user.tenantName || '-'} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 10, height: 22, borderColor: C.border }} />
                            {user.roles?.map((r) => (
                                <Chip key={r} label={r} size="small" sx={{ backgroundColor: '#E4EEF7', color: '#2E5C8A', fontWeight: 600, fontSize: 10, height: 22 }} />
                            ))}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2E7A4F, #4ADE80)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailOutlinedIcon sx={{ fontSize: 16, color: '#2E7A4F' }} />
                            {t('profile.updateEmail')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, gap: 1.5 }}>
                            <TextField
                                size="small"
                                label={t('profile.newEmail')}
                                type="email"
                                {...registerEmail('newEmail', {
                                    required: t('validation.newEmailRequired'),
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: t('validation.invalidEmail')
                                    }
                                })}
                                error={!!emailErrors.newEmail}
                                helperText={emailErrors.newEmail?.message}
                            />
                            <TextField
                                size="small"
                                label={t('auth.password')}
                                type="password"
                                {...registerEmail('password', { required: t('validation.passwordRequired') })}
                                error={!!emailErrors.password}
                                helperText={emailErrors.password?.message}
                            />
                            <Button onClick={handleSubmitEmail(onSubmitEmail)} disabled={emailLoading} size="small" sx={{ alignSelf: 'flex-end', mb: '2px', whiteSpace: 'nowrap' }}>
                                {emailLoading ? t('common.saving') : t('profile.update')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2E5C8A, #6366F1)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LockOutlinedIcon sx={{ fontSize: 16, color: '#2E5C8A' }} />
                            {t('profile.changePassword')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 1.5 }}>
                            <TextField
                                size="small"
                                label={t('profile.currentPassword')}
                                type="password"
                                {...register('currentPassword', { required: t('validation.currentPasswordRequired') })}
                                error={!!errors.currentPassword}
                                helperText={errors.currentPassword?.message}
                            />
                            <TextField
                                size="small"
                                label={t('profile.newPassword')}
                                type="password"
                                {...register('newPassword', {
                                    required: t('validation.newPasswordRequired'),
                                    minLength: { value: 8, message: t('validation.minLength') },
                                    pattern: {
                                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
                                        message: t('validation.passwordComplexity')
                                    }
                                })}
                                error={!!errors.newPassword}
                                helperText={errors.newPassword?.message}
                            />
                            <TextField
                                size="small"
                                label={t('profile.confirmPassword')}
                                type="password"
                                {...register('confirmPassword', { required: t('validation.confirmPasswordRequired') })}
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                            <Button onClick={handleSubmit(onSubmitPassword)} disabled={passwordLoading} size="small">
                                {passwordLoading ? t('common.saving') : t('common.save')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 2, position: 'relative', overflow: 'visible' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #5E4B9E, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityOutlinedIcon sx={{ fontSize: 16, color: '#5E4B9E' }} />
                        {t('profile.twoFactor')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('common.status')}:
                        </Typography>
                        <Chip
                            label={twoFaEnabled ? t('profile.twoFaEnabled') : t('common.disabled')}
                            size="small"
                            sx={{ backgroundColor: twoFaEnabled ? '#E0F1E6' : '#F3F4F6', color: twoFaEnabled ? '#2E7A4F' : '#6B7280', fontWeight: 700, fontSize: 10, height: 22 }}
                        />
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 13, mb: 2 }}>
                        {t('profile.twoFaDescription')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Button onClick={handleEnableTwoFa} disabled={twoFaLoading} size="small">{twoFaLoading ? t('common.loading') : t('profile.enable2fa')}</Button>
                        <Button onClick={handleVerifyTwoFa} disabled={twoFaLoading || !twoFaSetup} size="small">{t('profile.verifyEnable')}</Button>
                        <Button onClick={handleDisableTwoFa} disabled={twoFaLoading || !twoFaEnabled} size="small">{t('profile.disable2fa')}</Button>
                        {twoFaEnabled && <Button onClick={handleShowBackupCodes} size="small">{t('profile.backupCodesShow')}</Button>}
                    </Box>
                    <TextField
                        size="small"
                        label={t('profile.twoFaCode')}
                        value={twoFaCode}
                        onChange={(event) => setTwoFaCode(event.target.value)}
                        placeholder="123456"
                        slotProps={{ htmlInput: { maxLength: 6 } }}
                        sx={{ maxWidth: 200 }}
                    />
                    {twoFaSetup && twoFaSetup.qrCodePngBase64 && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#FFFFFF', borderRadius: 2, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: C.muted, mb: 1.5, fontWeight: 600 }}>{t('profile.scanQr')}</Typography>
                            <Box component="img" src={`data:image/png;base64,${twoFaSetup.qrCodePngBase64}`} alt={t('profile.qrCodeAlt')}
                                sx={{ width: 160, height: 160, border: `1px solid ${C.border}`, borderRadius: 2 }} />
                            <Typography variant="caption" sx={{ display: 'block', color: C.subtle, mt: 1, wordBreak: 'break-all', fontSize: 10 }}>
                                {t('profile.secret', { secret: twoFaSetup.secret })}
                            </Typography>
                            <Typography variant="body2" sx={{ color: C.muted, mt: 1.5 }}>{t('profile.verifyInstructions')}</Typography>
                        </Box>
                    )}
                    {showBackupCodes && backupCodes && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#FFFBEB', borderRadius: 2, border: '1px solid #FDE68A' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, color: '#92400E', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityOutlinedIcon sx={{ fontSize: 14 }} />
                                {t('profile.backupCodesTitle')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#B45309', display: 'block', mb: 1.5, fontSize: 11 }}>
                                {t('profile.backupCodesDescription')}
                            </Typography>
                            <Box sx={{ fontFamily: 'monospace', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {backupCodes?.codes.map((code, i) => (
                                    <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: 12, color: '#92400E', letterSpacing: '0.05em' }}>
                                        {code.replace(/-/g, '')}
                                    </Typography>
                                ))}
                            </Box>
                            <Divider sx={{ my: 1.5, borderColor: '#FDE68A' }} />
                            <Button onClick={handleRegenerateBackupCodes} size="small">{t('profile.regenerateCodes')}</Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={handleLogout} sx={{ backgroundColor: '#A23B4E', '&:hover': { backgroundColor: '#8A2E3E' }, gap: 1 }}>
                    <LogoutIcon sx={{ fontSize: 16 }} />
                    {t('auth.logout')}
                </Button>
            </Box>
        </Box>
    );
};

export default Profile;
