import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

import type { CostRecordResponse } from '../../../services/cloudPricerService';
import { type PeriodFilter } from './constants';
import { C } from '../../../theme/tokens';

interface CostChartsProps {
    costs: CostRecordResponse[];
    totals: { totalCost: number; compute: number; storage: number; network: number; backup: number; os: number };
    periodFilter: PeriodFilter;
    onPeriodFilterChange: (filter: PeriodFilter) => void;
}

const FILTERS: PeriodFilter[] = ['week', 'month', 'year', 'all'];

const CostCharts = ({ costs, totals, periodFilter, onPeriodFilterChange }: CostChartsProps) => {
    const { t } = useTranslation();

    const chartData = (() => {
        const sorted = [...costs].sort(
            (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
        );
        return sorted.map((c, i) => ({
            label: `#${i + 1}`,
            date: new Date(c.periodStart).toLocaleDateString(),
            compute: c.computeCost,
            storage: c.storageCost,
            network: c.networkCost,
            backup: c.backupCost,
            os: c.osCost,
            total: c.totalCost
        }));
    })();

    const breakdownBarData = [
        { name: t('costs.computeLabel'), value: totals.compute, fill: '#2E5C8A' },
        { name: t('costs.storageLabel'), value: totals.storage, fill: '#8A6A2E' },
        { name: t('costs.networkLabel'), value: totals.network, fill: '#10B981' },
        { name: t('costs.backupLabel'), value: totals.backup, fill: '#5E4B9E' },
        { name: t('costs.osLabel'), value: totals.os, fill: '#C95B6E' }
    ];

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {t('costs.costEvolution')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {FILTERS.map((p) => (
                                    <Chip
                                        key={p}
                                        label={t(`costs.periodFilter_${p}` as any, p)}
                                        size="small"
                                        variant={periodFilter === p ? 'filled' : 'outlined'}
                                        onClick={() => onPeriodFilterChange(p)}
                                        sx={{ fontWeight: 600, borderRadius: 2 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={C.brand} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={C.brand} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.muted }} />
                                <YAxis tick={{ fontSize: 12, fill: C.muted }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="total" name={t('costs.totalCost')} stroke={C.brand} fill="url(#gradTotal)" strokeWidth={2} />
                                <Area type="monotone" dataKey="compute" name={t('costs.computeLabel')} stroke="#2E5C8A" fill="transparent" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="storage" name={t('costs.storageLabel')} stroke="#8A6A2E" fill="transparent" strokeWidth={1.5} />
                                <Area type="monotone" dataKey="network" name={t('costs.networkLabel')} stroke="#10B981" fill="transparent" strokeWidth={1.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            {t('costs.breakdownByType')}
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={breakdownBarData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis type="number" tick={{ fontSize: 12, fill: C.muted }} />
                                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12, fill: C.muted }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {breakdownBarData.map((entry, index) => (
                                        <rect key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
};

export default CostCharts;