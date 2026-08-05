import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import Button from '../../../components/MyCustomButton';
import { resetPassword } from '../../../services/authService';
import { C} from '../../../theme/tokens';

type ResetPasswordForm = {
    password: string;
    confirmPassword: string;
};

const ResetPassword = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const { token } = useParams();
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors }
    } = useForm<ResetPasswordForm>();

    const handleResetPassword = async (input: ResetPasswordForm) => {
        if (!token) {
            toast.error(t('auth.resetTokenMissing'));
            return;
        }

        if (input.password !== input.confirmPassword) {
            setError('confirmPassword', {
                type: 'validate',
                message: t('validation.passwordsDoNotMatch')
            });
            return;
        }

        setLoading(true);

        try {
            await resetPassword({
                token,
                newPassword: input.password
            });
            toast.success(t('auth.passwordResetSuccess'));
            navigate('/login');
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('auth.passwordResetFailed');
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
                    <LockResetOutlinedIcon sx={{ color: '#fff', fontSize: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                    {t('auth.resetPasswordTitle')}
                </Typography>
                <Typography sx={{ color: C.muted, mb: 2, textAlign: 'center' }}>
                    {t('auth.resetPasswordDesc')}
                </Typography>
                <TextField
                    label={t('auth.newPassword')}
                    type="password"
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    id="outlined-basic"
        {...register('password', {
            required: t('validation.passwordRequired'),
            minLength: { value: 8, message: t('validation.minLength') },
            pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
                message: t('validation.passwordComplexity')
            }
        })}
                    placeholder={t('auth.newPassword')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': { borderColor: C.brand }
                        },
                        '& label.Mui-focused': { color: C.brand }
                    }}
                />
                <TextField
                    label={t('auth.confirmPassword')}
                    type="password"
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    id="outlined-basic"
        {...register('confirmPassword', {
            required: t('validation.confirmPasswordRequired'),
            minLength: { value: 8, message: t('validation.minLength') }
        })}
                    placeholder={t('auth.confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': { borderColor: C.brand }
                        },
                        '& label.Mui-focused': { color: C.brand }
                    }}
                />
                <Button
                    onClick={handleSubmit(handleResetPassword)}
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
                    {loading ? t('common.saving') : t('auth.resetPassword')}
                </Button>

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

export default ResetPassword;
