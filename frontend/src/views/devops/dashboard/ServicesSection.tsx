import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ServiceResponse } from '../../../services/devopsService';
import { statusColor } from './dashboardUtils';
import { C} from '../../../theme/tokens';

interface ServicesSectionProps {
    services: ServiceResponse[];
}

const ServicesSection = ({ services }: ServicesSectionProps) => {
    const { t } = useTranslation();
    const activeServices = services.filter((s) => s.status?.toUpperCase() === 'ACTIVE').length;

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('dashboard.devopsDashboard.services')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('dashboard.devopsDashboard.allRegisteredServices')}
                        </Typography>
                    </Box>
                    <Chip
                        label={t('dashboard.devopsDashboard.activeCount', { active: activeServices, total: services.length })}
                        size="small"
                        sx={{
                            backgroundColor: activeServices === services.length ? '#E0F1E6' : '#F7ECD6',
                            color: activeServices === services.length ? '#2E7A4F' : '#8A6A2E',
                            fontWeight: 700
                        }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                {services.length === 0 ? (
                    <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                        {t('dashboard.devopsDashboard.noServices')}
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {services.map((s) => {
                            const sc = statusColor(s.status);
                            return (
                                <Box
                                    key={s.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        p: 1.25,
                                        borderRadius: 2,
                                        border: '1px solid #F5D8E4',
                                        backgroundColor: '#FFFFFF',
                                        '&:hover': { backgroundColor: '#FFF8FA' }
                                    }}
                                >
                                    {sc.icon}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                            {s.name}
                                        </Typography>
                                        <Typography sx={{ color: C.muted, fontSize: 11 }}>
                                            {s.type || 'Service'}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={s.status}
                                        size="small"
                                        sx={{ backgroundColor: sc.bg, color: sc.fg, fontWeight: 700, fontSize: 10 }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default ServicesSection;
