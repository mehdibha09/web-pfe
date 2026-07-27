import { Box, Typography } from '@mui/material';
import { C } from '../theme/tokens';

interface LoadingSpinnerProps {
    size?: number;
    message?: string;
    variant?: 'inline' | 'block' | 'page';
}

const LoadingSpinner = ({ size = 28, message, variant = 'block' }: LoadingSpinnerProps) => {
    const spinner = (
        <Box sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2.5px solid ${C.border}`,
            borderTopColor: C.brand,
            borderRightColor: C.brandDark,
            animation: 'ls-spin 0.7s linear infinite',
            '@keyframes ls-spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
            }
        }} />
    );

    if (variant === 'inline') return spinner;

    if (variant === 'block') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 6 }}>
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{
                        width: size + 16,
                        height: size + 16,
                        borderRadius: '50%',
                        background: `conic-gradient(from 0deg, ${C.brand}33, ${C.brandDark}33, ${C.brand}33)`,
                        animation: 'ls-pulse 1.5s ease-in-out infinite',
                        '@keyframes ls-pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 0.5 },
                            '50%': { transform: 'scale(1.15)', opacity: 0.8 }
                        }
                    }} />
                    <Box sx={{ position: 'absolute' }}>{spinner}</Box>
                </Box>
                {message && (
                    <Typography sx={{ color: C.muted, fontSize: 13, fontWeight: 600, animation: 'ls-fade 1.2s ease-in-out infinite', '@keyframes ls-fade': { '0%, 100%': { opacity: 0.5 }, '50%': { opacity: 1 } } }}>
                        {message}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', gap: 2,
            animation: 'ls-fadeIn 0.3s ease-out',
            '@keyframes ls-fadeIn': { '0%': { opacity: 0 }, '100%': { opacity: 1 } }
        }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: `conic-gradient(from 0deg, ${C.brand}, ${C.brandDark}, #6366F1, ${C.brand})`,
                    animation: 'ls-rotate 1s linear infinite',
                    '@keyframes ls-rotate': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Box sx={{ width: 58, height: 58, borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
                </Box>
                <Box sx={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', border: `2.5px solid ${C.brand}`, borderTopColor: 'transparent', animation: 'ls-spin 0.6s linear infinite', '@keyframes ls-spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </Box>
            {message && (
                <Typography sx={{ color: C.muted, fontSize: 14, fontWeight: 700 }}>
                    {message}
                </Typography>
            )}
        </Box>
    );
};

export default LoadingSpinner;
