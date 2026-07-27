import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import { forgotPassword } from '../../../services/authService';
import { C} from '../../../theme/tokens';

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

    const handleForgotPassword = async (email: ForgotPasswordForm) => {
        setLoading(true);
        try {
            await forgotPassword({ email: email.email });
            toast.success(t('auth.resetLinkSent'));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('auth.emailNotSent');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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
                        // src={LogoAscend}
                        alt="logo"
                        style={{ width: '400px', height: '70px', margin: '2rem 0' }}
                    />
                    <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
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
                        id="outlined-basic"
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
                    <Box>
                        <Button
                            onClick={handleSubmit(handleForgotPassword)}
                            disabled={loading}
                            sx={{
                                my: 2,
                                padding: '0.5rem 2rem',
                                alignSelf: 'flex-end'
                            }}
                        >
                            {loading ? t('auth.sending') : t('auth.sendResetLink')}
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
        </>
    );
};

export default ForgetPassword;
