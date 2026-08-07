import { Box, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../../components/MyCustomButton';
import { login } from '../../../services/authService';
import { saveSession, setPendingTwoFactorSession } from '../../../services/authStorage';
import { C} from '../../../theme/tokens';

type LoginForm = {
    email: string;
    password: string;
};

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
                email: input.email,
                password: input.password
            });

            if (response.twoFaRequired) {
                setPendingTwoFactorSession({
                    email: normalizedEmail
                });
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
                'User is inactive': t('auth.userInactive'),
            };
            const message = enToFr[serverMsg] || serverMsg || error?.message || t('auth.loginFailed');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100vh'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100vh',
                    backgroundColor: `${C.brand}c5`,
                    md: {
                        display: 'none',
                        width: '0%',
                        height: '0%'
                    },
                    sm: {
                        display: 'none',
                        width: '0%',
                        height: '0%'
                    },
                    xs: {
                        display: 'none',
                        width: '0%',
                        height: '0%'
                    }
                }}
            >
                {/* <LoginAnimation /> */}
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '20px',
                    backgroundColor: '#ffffff',
                    height: '100vh'
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 'bold',
                        fontSize: '30px',
                        fontFamily: 'cursive'
                    }}
                >
                    {/* <img src={LogoAscend} alt="logo" style={{ width: '400px', height: '70px' }} /> */}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: C.text, mb: -1 }}>
                    {t('auth.welcomeBack')}
                </Typography>
                <Typography sx={{ color: C.muted, mb: 1 }}>
                    {t('auth.signIn')}
                </Typography>

                <TextField
                    variant="outlined"
                    id="outlined-basic"
                    label={t('auth.email')}
                    sx={{
                        width: '50%'
                    }}
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
                    label={t('auth.password')}
                    variant="outlined"
                    id="outlined-basic"
                    type="password"
                    sx={{
                        width: '50%'
                    }}
        // TEMP: password validation disabled for testing — re-enable before prod
        // {...register('password', {
        //     required: 'Password is required',
        //     minLength: { value: 8, message: 'At least 8 characters' },
        //     pattern: {
        //         value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
        //         message: 'Must contain uppercase, lowercase, digit, and special character'
        //     }
        // })}
        {...register('password', { required: t('validation.passwordRequired') })}
                    placeholder={t('auth.password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                />
                <Button
                    disabled={loading}
                    sx={{
                        width: '50%',
                        padding: '10px'
                    }}
                    onClick={handleSubmit(handleLogin)}
                >
                    {loading ? t('common.loading') : t('auth.login')}
                </Button>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '50%'
                    }}
                >
                    <Typography
                        variant="body2"
                        component={Link}
                        to="/forgetPassword"
                        sx={{
                            color: C.brand
                        }}
                    >
                        {t('auth.forgotPassword')}
                    </Typography>
                    {/* SSO commented out — not configured for testing
                    <Typography
                        variant="body2"
                        component={Link}
                        to="/sso"
                        sx={{
                            color: C.brand,
                            fontWeight: 600
                        }}
                    >
                        {t('auth.ssoLogin')}
                    </Typography>
                    */}
                </Box>
            </Box>
        </Box>
    );
};

export default Login;
