import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { C, R } from '../theme/tokens';

interface KpiCardProps {
    /** 'row' (compact horizontal, default) or 'stat' (dashboard tile). */
    variant?: 'row' | 'stat';
    value: string | number;
    icon?: ReactNode;
    color?: string;
    onClick?: () => void;

    // row variant
    label?: string;
    bg?: string;
    gradient?: string;
    selected?: boolean;

    // stat variant
    title?: string;
    subtitle?: string;
    bgColor?: string;
}

const KpiCard = ({
    variant = 'row',
    value,
    icon,
    color,
    onClick,
    label,
    bg,
    gradient,
    selected,
    title,
    subtitle,
    bgColor
}: KpiCardProps) => {
    if (variant === 'stat') {
        return (
            <Card
                onClick={onClick}
                sx={{
                    borderRadius: `${R.card}px`,
                    border: `1px solid ${C.border}`,
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    '&:hover': onClick
                        ? { boxShadow: '0 8px 30px rgba(228,71,125,0.12)', transform: 'translateY(-2px)' }
                        : {},
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBFE 100%)'
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography sx={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {title}
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: C.text, mt: 0.5 }}>
                                {value}
                            </Typography>
                            <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.5 }}>
                                {subtitle}
                            </Typography>
                        </Box>
                        {icon && (
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    backgroundColor: bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    }

    // row variant (default)
    return (
        <Card
            sx={{
                borderRadius: `${R.card}px`,
                backgroundColor: gradient ? undefined : bg,
                background: gradient || undefined,
                cursor: onClick ? 'pointer' : undefined,
                outline: selected ? `2px solid ${color || C.brand}` : 'none',
                border: bg ? `1px solid ${color || C.brand + '22'}` : `1px solid ${C.border}`,
                '&:hover': onClick ? { boxShadow: 3 } : undefined
            }}
            onClick={onClick}
        >
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                {icon && (
                    <Typography sx={{ fontSize: 28 }}>{icon}</Typography>
                )}
                <Typography variant="h4" sx={{ fontWeight: 900, color: color || C.brand }}>
                    {value}
                </Typography>
                <Typography sx={{ color: color || C.muted, fontWeight: 600, fontSize: 13 }}>
                    {label}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default KpiCard;
