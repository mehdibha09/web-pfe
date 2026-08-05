import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HistoryEntry } from '../../../services/interfaces/devops';
import { actionColor } from './dashboardUtils';
import { C} from '../../../theme/tokens';

interface RecentDeploymentsSectionProps {
    history: HistoryEntry[];
}

const RecentDeploymentsSection = ({ history }: RecentDeploymentsSectionProps) => {
    const { t } = useTranslation();
    const recent = [...history]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 5);

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('dashboard.devopsDashboard.recentActivity')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('dashboard.devopsDashboard.latestDeploymentActivity')}
                        </Typography>
                    </Box>
                    <Chip
                        label={t('dashboard.devopsDashboard.totalCount', { count: history.length })}
                        size="small"
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                {recent.length === 0 ? (
                    <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                        {t('dashboard.devopsDashboard.noDeployments')}
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recent.map((entry) => {
                            const ac = actionColor(entry.action);
                            return (
                                <Box
                                    key={entry.id}
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
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1.5,
                                            backgroundColor: ac.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: ac.fg }}>
                                            {entry.action?.slice(0, 3).toUpperCase()}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                            {entry.action}
                                        </Typography>
                                        <Typography sx={{ color: C.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.resource || '—'}
                                            {entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ''} · {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : ''}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ color: C.subtle, fontSize: 10, flexShrink: 0 }}>
                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}
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

export default RecentDeploymentsSection;
