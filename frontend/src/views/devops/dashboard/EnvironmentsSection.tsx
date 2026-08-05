import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { EnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import { C} from '../../../theme/tokens';

interface EnvironmentsSectionProps {
    environments: EnvironmentResponse[];
    services: ServiceResponse[];
}

const EnvironmentsSection = ({ environments, services }: EnvironmentsSectionProps) => {
    const { t } = useTranslation();
    return (
    <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
        <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, mb: 0.5 }}>
                {t('dashboard.devopsDashboard.environments')}
            </Typography>
            <Typography sx={{ color: C.muted, fontSize: 13, mb: 2 }}>
                {t('dashboard.devopsDashboard.infrastructureStatus')}
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
            {environments.length === 0 ? (
                <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                    {t('dashboard.devopsDashboard.noEnvironments')}
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {environments.map((env) => {
                        const envServices = services.filter((s) => s.tenantId === env.tenantId);
                        return (
                            <Box
                                key={env.id}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: '1px solid #F5D8E4',
                                    backgroundColor: '#FFFFFF'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 14 }}>
                                        {env.name}
                                    </Typography>
                                    <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 18 }} />
                                </Box>
                                <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.5 }}>
                                    {env.description || t('dashboard.devopsDashboard.noDescription')}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                    <Typography sx={{ fontSize: 11, color: C.muted }}>
                                        <strong>{envServices.length}</strong> {t('dashboard.devopsDashboard.services')}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </CardContent>
    </Card>
    );
};

export default EnvironmentsSection;
