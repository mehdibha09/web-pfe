import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CostRecordResponse } from '../../../services/cloudPricerService';
import { C} from '../../../theme/tokens';

interface CostOverviewSectionProps {
    costs: CostRecordResponse[];
}

const CostOverviewSection = ({ costs }: CostOverviewSectionProps) => {
    const { t } = useTranslation();

    if (costs.length === 0) return null;

    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);

    return (
        <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('dashboard.costOverview.title')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('dashboard.costOverview.lastRecords', { count: Math.min(costs.length, 5) })}
                        </Typography>
                    </Box>
                    <Chip
                        label={t('dashboard.costOverview.totalCost', { total: totalCost.toFixed(2) })}
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 800 }}
                    />
                </Box>
                <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {[...costs]
                        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                        .slice(0, 3)
                        .map((c) => (
                            <Box
                                key={c.id}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: '1px solid #F5D8E4',
                                    backgroundColor: '#FFFFFF'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                        {c.mode}
                                    </Typography>
                                    <AttachMoneyIcon sx={{ color: C.brand, fontSize: 18 }} />
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, mt: 0.5 }}>
                                    ${c.totalCost.toFixed(2)}
                                </Typography>
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography sx={{ fontSize: 10, color: C.muted }}>
                                        {t('dashboard.costOverview.compute', { cost: c.computeCost.toFixed(0) })}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: C.muted }}>
                                        {t('dashboard.costOverview.storage', { cost: c.storageCost.toFixed(0) })}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: C.muted }}>
                                        {t('dashboard.costOverview.network', { cost: c.networkCost.toFixed(0) })}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((c.totalCost / (totalCost || 1)) * 100, 100)}
                                    sx={{
                                        mt: 1.5,
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: '#F5D8E4',
                                        '& .MuiLinearProgress-bar': { backgroundColor: C.brand }
                                    }}
                                />
                            </Box>
                        ))}
                </Box>
            </CardContent>
        </Card>
    );
};

export default CostOverviewSection;
