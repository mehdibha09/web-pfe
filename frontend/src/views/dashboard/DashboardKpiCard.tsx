import {
    Box,
    Card,
    CardContent,
    Typography
} from '@mui/material';
import type { ReactNode } from 'react';
import { C } from '../../theme/tokens';

interface DashboardKpiCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: ReactNode;
    color: string;
    bgColor: string;
    onClick?: () => void;
}

const DashboardKpiCard = ({ title, value, subtitle, icon, color, bgColor, onClick }: DashboardKpiCardProps) => (
    <Card
        onClick={onClick}
        sx={{
            borderRadius: 3,
            border: '1px solid #F5D8E4',
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
            </Box>
        </CardContent>
    </Card>
);

export default DashboardKpiCard;
