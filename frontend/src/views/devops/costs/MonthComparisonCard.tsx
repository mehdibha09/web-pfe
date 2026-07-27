import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CostRecordResponse } from '../../../services/cloudPricerService';
import { C } from '../../../theme/tokens';

interface MonthComparisonCardProps {
    costs: CostRecordResponse[];
}

const MonthComparisonCard = ({ costs }: MonthComparisonCardProps) => {
    const { t } = useTranslation();

    const previousMonthTotal = useMemo(() => {
        const now = new Date();
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return costs
            .filter(c => {
                const pStart = new Date(c.periodStart);
                return pStart >= prevStart && pStart <= prevEnd;
            })
            .reduce((s, c) => s + c.totalCost, 0);
    }, [costs]);

    const currentMonthTotal = useMemo(() => {
        const now = new Date();
        const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return costs
            .filter(c => {
                const pStart = new Date(c.periodStart);
                return pStart >= curStart && pStart <= curEnd;
            })
            .reduce((s, c) => s + c.totalCost, 0);
    }, [costs]);

    const monthDelta = previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
    const isUp = monthDelta >= 0;

    return (
        <Card sx={{ borderRadius: 3, mb: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('costs.monthOverMonth')}
                    </Typography>
                    <Chip
                        icon={isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label={t('costs.vsLastMonth', { delta: `${isUp ? '+' : ''}${monthDelta.toFixed(1)}` })}
                        sx={{
                            backgroundColor: isUp ? '#F7DEE3' : '#E0F1E6',
                            color: isUp ? '#A23B4E' : '#2E7A4F',
                            fontWeight: 700
                        }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: C.muted }}>{t('costs.currentMonth')}</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: isUp ? '#C95B6E' : C.brand }}>
                            ${currentMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: C.muted }}>{t('costs.previousMonth')}</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.muted }}>
                            ${previousMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default MonthComparisonCard;