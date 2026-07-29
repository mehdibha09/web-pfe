import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { K8sDeployment } from '../../../services/interfaces/k8s';
import { C} from '../../../theme/tokens';

const statusColor = (s: string) => {
    const up = s?.toUpperCase();
    if (up === 'RUNNING' || up === 'ACTIVE') return { bg: '#E0F1E6', fg: '#2E7A4F' };
    if (up === 'PENDING' || up === 'PENDING') return { bg: '#F7ECD6', fg: '#8A6A2E' };
    if (up === 'FAILED') return { bg: '#F7DEE3', fg: '#A23B4E' };
    return { bg: '#F3F4F6', fg: '#6B7280' };
};

interface K8sDeploymentsSectionProps {
    deployments: K8sDeployment[];
}

const K8sDeploymentsSection = ({ deployments }: K8sDeploymentsSectionProps) => {
    const { t } = useTranslation();
    const running = deployments.filter((d) => d.status?.toUpperCase() === 'RUNNING' || d.status?.toUpperCase() === 'ACTIVE').length;
    const failed = deployments.filter((d) => d.status?.toUpperCase() === 'FAILED').length;

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('dashboard.devopsDashboard.k8sDeployments')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('dashboard.devopsDashboard.k8sDeploymentsStatus')}
                        </Typography>
                    </Box>
                    <Chip
                        label={t('dashboard.devopsDashboard.k8sRunningCount', { running, failed, total: deployments.length })}
                        size="small"
                        sx={{
                            backgroundColor: failed > 0 ? '#F7DEE3' : '#E0F1E6',
                            color: failed > 0 ? '#A23B4E' : '#2E7A4F',
                            fontWeight: 700
                        }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                {deployments.length === 0 ? (
                    <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                        {t('dashboard.devopsDashboard.noK8sDeployments')}
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {deployments.map((d) => {
                            const sc = statusColor(d.status);
                            return (
                                <Box
                                    key={d.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: '1px solid #F5D8E4',
                                        backgroundColor: '#FFFFFF',
                                        '&:hover': { backgroundColor: '#FFF8FA' }
                                    }}
                                >
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sc.fg, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                            {d.name}
                                        </Typography>
                                        <Typography sx={{ color: C.muted, fontSize: 11 }}>
                                            {d.dockerImage || d.namespace || ''}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Typography sx={{ color: C.muted, fontSize: 11 }}>
                                            {t('dashboard.devopsDashboard.k8sReplicas', { count: d.replicas || 0 })}
                                        </Typography>
                                        <Chip
                                            label={d.status || '-'}
                                            size="small"
                                            sx={{ backgroundColor: sc.bg, color: sc.fg, fontWeight: 700, fontSize: 10 }}
                                        />
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

export default K8sDeploymentsSection;
