import MemoryIcon from '@mui/icons-material/Memory';
import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MetricResponse } from '../../../services/devopsService';
import { C} from '../../../theme/tokens';
import { isMetricStale } from '../metrics/constants';

interface MetricsOverviewSectionProps {
    metrics: MetricResponse[];
}

const N_A = 'n/a';

const MetricsOverviewSection = ({ metrics }: MetricsOverviewSectionProps) => {
    const { t } = useTranslation();

    if (metrics.length === 0) return null;

    const latest = metrics.reduce((a, b) =>
        new Date(a.createdAt || 0).getTime() > new Date(b.createdAt || 0).getTime() ? a : b
    );
    const stale = isMetricStale(latest);
    const avgCpu = metrics.reduce((s, m) => s + m.cpuUsage, 0) / metrics.length;
    const avgRam = metrics.reduce((s, m) => s + m.ramUsage, 0) / metrics.length;
    const totalPods = metrics[metrics.length - 1]?.pods || 0;

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('dashboard.devopsDashboard.metricsTitle')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('dashboard.devopsDashboard.metricsSubtitle')}
                        </Typography>
                    </Box>
                    <Chip
                        icon={<MemoryIcon sx={{ fontSize: 14 }} />}
                        label={stale ? N_A : t('dashboard.devopsDashboard.metricsChip', { count: metrics.length })}
                        size="small"
                        sx={stale ? { backgroundColor: '#F7DEE3', color: '#C95B6E', fontWeight: 700 } : { backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #F5D8E4' }}>
                        <Typography sx={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {t('dashboard.devopsDashboard.metricsCpu')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, mt: 0.5 }}>
                            {stale ? N_A : `${avgCpu.toFixed(1)}%`}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={stale ? 0 : Math.min(avgCpu, 100)}
                            sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: '#F5D8E4', '& .MuiLinearProgress-bar': { backgroundColor: avgCpu > 80 ? '#C95B6E' : '#2E7A4F', borderRadius: 3 } }}
                        />
                    </Box>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #F5D8E4' }}>
                        <Typography sx={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {t('dashboard.devopsDashboard.metricsRam')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, mt: 0.5 }}>
                            {stale ? N_A : `${avgRam.toFixed(1)}%`}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={stale ? 0 : Math.min(avgRam, 100)}
                            sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: '#F5D8E4', '& .MuiLinearProgress-bar': { backgroundColor: avgRam > 80 ? '#C95B6E' : '#2E5C8A', borderRadius: 3 } }}
                        />
                    </Box>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #F5D8E4' }}>
                        <Typography sx={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {t('dashboard.devopsDashboard.metricsPods')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, mt: 0.5 }}>
                            {stale ? N_A : totalPods}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 11, mt: 1 }}>
                            {t('dashboard.devopsDashboard.metricsLatest')} {stale ? N_A : latest.createdAt ? new Date(latest.createdAt).toLocaleTimeString() : ''}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default MetricsOverviewSection;
