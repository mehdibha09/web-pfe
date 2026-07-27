import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import type { AlertResponse } from '../../../services/cloudPricerService';
import { C} from '../../../theme/tokens';

interface RecentAlertsSectionProps {
    alerts: AlertResponse[];
}

const RecentAlertsSection = ({ alerts }: RecentAlertsSectionProps) => {
    const openAlerts = alerts.filter((a) => a.status === 'OPEN');
    const recentAlerts = [...alerts]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            Recent Alerts
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            Latest system alerts
                        </Typography>
                    </Box>
                    <Chip
                        label={`${openAlerts.length} open`}
                        size="small"
                        sx={{
                            backgroundColor: openAlerts.length > 0 ? '#F7DEE3' : '#E0F1E6',
                            color: openAlerts.length > 0 ? '#A23B4E' : '#2E7A4F',
                            fontWeight: 700
                        }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                {recentAlerts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 40, mb: 1 }} />
                        <Typography sx={{ color: C.subtle }}>
                            No alerts — all clear
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recentAlerts.map((a) => {
                            const isCritical = a.severity === 'CRITICAL';
                            const isOpen = a.status === 'OPEN';
                            return (
                                <Box
                                    key={a.id}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${isCritical && isOpen ? '#E6C2C9' : '#F5D8E4'}`,
                                        backgroundColor: isCritical && isOpen ? '#FFFBFB' : '#FFFFFF'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {isCritical ? (
                                                <ErrorIcon sx={{ fontSize: 16, color: '#C95B6E' }} />
                                            ) : (
                                                <WarningAmberIcon sx={{ fontSize: 16, color: '#8A6A2E' }} />
                                            )}
                                            <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                {a.metric}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={a.severity}
                                            size="small"
                                            sx={{
                                                backgroundColor: isCritical ? '#F7DEE3' : '#F7ECD6',
                                                color: isCritical ? '#A23B4E' : '#8A6A2E',
                                                fontWeight: 700,
                                                fontSize: 10
                                            }}
                                        />
                                    </Box>
                                    <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                        {a.message || `${a.actualValue} / ${a.threshold}`}
                                    </Typography>
                                    <Typography sx={{ color: C.subtle, fontSize: 10, mt: 0.5 }}>
                                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentAlertsSection;
