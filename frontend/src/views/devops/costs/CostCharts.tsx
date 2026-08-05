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
    LabelList,
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

const money = (v: number) => v.toLocaleString(undefined, {
    minimumFractionDigits: Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 4 : 2,
    maximumFractionDigits: Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 6 : 2
});

const totalOf = (totals: { totalCost: number; compute: number; storage: number; network: number; backup: number; os: number }) =>
    totals.compute + totals.storage + totals.network + totals.backup + totals.os;

const tooltipStyle = {
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
    fontSize: 12
};

const axisTick = { fontSize: 11, fill: C.muted };
const gridStroke = '#F0E4EA';

const CostCharts = ({ costs, totals, periodFilter, onPeriodFilterChange }: CostChartsProps) => {
    const { t } = useTranslation();

    const chartData = (() => {
        const byMonth = new Map<string, {
            label: string;
            compute: number;
            storage: number;
            network: number;
            backup: number;
            os: number;
            total: number;
        }>();
        for (const c of costs) {
            const d = new Date(c.periodStart);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
            const month = byMonth.get(key) ?? { label, compute: 0, storage: 0, network: 0, backup: 0, os: 0, total: 0 };
            month.compute += c.computeCost;
            month.storage += c.storageCost;
            month.network += c.networkCost;
            month.backup += c.backupCost;
            month.os += c.osCost;
            month.total += c.totalCost;
            byMonth.set(key, month);
        }
        return [...byMonth.values()];
    })();

    const grandTotal = totalOf(totals);
    const breakdownBarData = [
        { name: t('costs.computeLabel'), value: totals.compute, fill: '#2E5C8A' },
        { name: t('costs.storageLabel'), value: totals.storage, fill: '#8A6A2E' },
        { name: t('costs.networkLabel'), value: totals.network, fill: '#10B981' },
        { name: t('costs.backupLabel'), value: totals.backup, fill: '#5E4B9E' },
        { name: t('costs.osLabel'), value: totals.os, fill: '#C95B6E' }
    ].filter((d) => d.value > 0);

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        px: 3, py: 2,
                        background: 'linear-gradient(135deg, #FFF0F6 0%, #FDF7FF 100%)',
                        borderBottom: `1px solid ${C.border}`
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
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
                                    sx={{
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        ...(periodFilter === p ? { bgcolor: C.brand, color: '#fff' } : {})
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={C.brand} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${money(v)}`} width={60} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`$${money(Number(value))}`, '']} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Area type="monotone" dataKey="total" name={t('costs.totalCost')} stroke={C.brand} fill="url(#gradTotal)" strokeWidth={2.5} dot={{ r: 3, fill: C.brand, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                <Area type="monotone" dataKey="compute" name={t('costs.computeLabel')} stroke="#2E5C8A" fill="transparent" strokeWidth={1.5} strokeDasharray="5 3" />
                                <Area type="monotone" dataKey="storage" name={t('costs.storageLabel')} stroke="#8A6A2E" fill="transparent" strokeWidth={1.5} strokeDasharray="5 3" />
                                <Area type="monotone" dataKey="network" name={t('costs.networkLabel')} stroke="#10B981" fill="transparent" strokeWidth={1.5} strokeDasharray="5 3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}>
                    <Box sx={{
                        px: 3, py: 2,
                        background: 'linear-gradient(135deg, #F5F3FF 0%, #FDF7FF 100%)',
                        borderBottom: `1px solid ${C.border}`
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('costs.breakdownByType')}
                        </Typography>
                    </Box>
                    <CardContent>
                        {breakdownBarData.length === 0 ? (
                            <Box sx={{ py: 10, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: C.muted }}>
                                    {t('costs.noData')}
                                </Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={breakdownBarData} layout="vertical" margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="4 3" stroke={gridStroke} horizontal={false} />
                                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${money(v)}`} />
                                    <YAxis dataKey="name" type="category" width={90} tick={axisTick} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: any) => [
                                            `$${money(Number(value))}${grandTotal > 0 ? ` (${((Number(value) / grandTotal) * 100).toFixed(1)}%)` : ''}`,
                                            ''
                                        ]}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                        {breakdownBarData.map((entry, index) => (
                                            <rect key={index} fill={entry.fill} />
                                        ))}
                                        <LabelList dataKey="value" position="right" formatter={(v: any) => `$${money(Number(v))}`} style={{ fill: C.muted, fontSize: 11, fontWeight: 700 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
};

export default CostCharts;