import type { ReactNode } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { C } from '../theme/tokens';

interface KpiCardProps {
    label: string;
    value: string | number;
    bg?: string;
    color?: string;
    icon?: ReactNode;
    gradient?: string;
    onClick?: () => void;
    selected?: boolean;
}

const KpiCard = ({ label, value, bg, color, icon, gradient, onClick, selected }: KpiCardProps) => (
    <Card
        sx={{
            borderRadius: 3,
            backgroundColor: gradient ? undefined : bg,
            background: gradient || undefined,
            cursor: onClick ? 'pointer' : undefined,
            outline: selected ? `2px solid ${color || C.brand}` : 'none',
            border: bg ? `1px solid ${color || C.brand + '22'}` : '1px solid #E8D5DE',
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

export default KpiCard;
