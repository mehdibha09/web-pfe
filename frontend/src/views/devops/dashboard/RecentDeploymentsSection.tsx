import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import type { DeploymentResponse } from '../../../services/devopsService';
import { statusColor } from './dashboardUtils';
import { C} from '../../../theme/tokens';

interface RecentDeploymentsSectionProps {
    deployments: DeploymentResponse[];
}

const RecentDeploymentsSection = ({ deployments }: RecentDeploymentsSectionProps) => {
    const recentDeployments = [...deployments]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            Recent Deployments
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            Latest deployment activity
                        </Typography>
                    </Box>
                    <Chip
                        label={`${deployments.length} total`}
                        size="small"
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                {recentDeployments.length === 0 ? (
                    <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                        No deployments yet
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recentDeployments.map((d) => {
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
                                    {sc.icon}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                            {d.version || 'No version'}
                                        </Typography>
                                        <Typography sx={{ color: C.muted, fontSize: 11 }}>
                                            {d.notes || 'No notes'} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={d.status}
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

export default RecentDeploymentsSection;
