import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
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
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '30%',
                    minWidth: '360px',

                    padding: '2rem',
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    boxShadow: 20,
                    boxShadowColor: 'rgba(0, 0, 0, 0.35)'
                }}
            >
                <img
                    //   src={LogoAscend}
                    alt="logo"
                    style={{ width: '400px', height: '70px', margin: '2rem 0' }}
                />
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
                />
                <Box>
                    <Button
                        onClick={handleSubmit(handleResetPassword)}
                        disabled={loading}
                        sx={{
                            my: 2,
                            padding: '0.5rem 2rem',
                            alignSelf: 'flex-end'
                        }}
                    >
                        {loading ? t('common.saving') : t('auth.resetPassword')}
                    </Button>
                </Box>

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
