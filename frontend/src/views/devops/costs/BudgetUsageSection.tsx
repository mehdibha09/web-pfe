import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    LinearProgress,
    Skeleton,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { CostRecordResponse, QuotaResponse } from '../../../services/cloudPricerService';
import { listCosts, listQuotas } from '../../../services/cloudPricerService';
import {
    listServiceEnvironments,
    listServices,
    listEnvironments
} from '../../../services/devopsService';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { seLabel } from '../common/seLabel';

const getPct = (used: number, max: number): number =>
    max > 0 ? Math.min((used / max) * 100, 100) : 0;

interface SeRow {
    seId: string;
    seLabel: string;
    quota: QuotaResponse;
    usedCost: number;
    budgetPct: number;
}

const BudgetUsageSection = () => {
    const { t } = useTranslation();
    const [quotas, setQuotas] = useState<QuotaResponse[]>([]);
    const [costs, setCosts] = useState<CostRecordResponse[]>([]);
    const [seNames, setSeNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [quotaRes, costRes, seRes, svcRes, envRes] = await Promise.all([
                listQuotas(),
                listCosts(),
                listServiceEnvironments(),
                listServices(),
                listEnvironments()
            ]);
            const activeQuotas = quotaRes.filter((q) => q.isActive);

            const labels: Record<string, string> = {};
            for (const se of seRes) {
                labels[se.id] = seLabel(se, svcRes, envRes);
            }

            setQuotas(activeQuotas);
            setCosts(costRes);
            setSeNames(labels);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('costs.failedToLoad')));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Sum of all cost records per SE -> "used this month to date"
    const totalCostBySe = useMemo(() => {
        const map: Record<string, number> = {};
        for (const c of costs) {
            map[c.serviceEnvironmentId] = (map[c.serviceEnvironmentId] ?? 0) + c.totalCost;
        }
        return map;
    }, [costs]);

    const rows: SeRow[] = useMemo(() => {
        return quotas
            .map((q) => {
                const usedCost = totalCostBySe[q.serviceEnvironmentId] ?? 0;
                return {
                    seId: q.serviceEnvironmentId,
                    seLabel: seNames[q.serviceEnvironmentId] ?? q.serviceEnvironmentId.slice(0, 24) + '…',
                    quota: q,
                    usedCost,
                    budgetPct: getPct(usedCost, q.maxBudget)
                };
            })
            .sort((a, b) => b.budgetPct - a.budgetPct);
    }, [quotas, totalCostBySe, seNames]);

    const totals = useMemo(() => {
        let used = 0, budget = 0;
        for (const r of rows) {
            used += r.usedCost;
            budget += r.quota.maxBudget;
        }
        return { used, budget, budgetPct: getPct(used, budget) };
    }, [rows]);

    const renderBar = (label: string, used: number, max: number, unit: string, sub: string) => {
        const pct = getPct(used, max);
        const nearLimit = pct >= 90;
        return (
            <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: C.subtle, fontWeight: 600 }}>
                        {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {nearLimit && <WarningAmberIcon sx={{ fontSize: 14, color: '#C95B6E' }} />}
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: nearLimit ? '#C95B6E' : C.text }}
                        >
                            {used.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {max.toLocaleString()} {unit}
                        </Typography>
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: nearLimit ? '#F7DEE3' : C.brandLight,
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            background: nearLimit
                                ? 'linear-gradient(90deg, #C95B6E88, #C95B6E)'
                                : `linear-gradient(90deg, ${C.brand}88, ${C.brand})`
                        }
                    }}
                />
                {sub && (
                    <Typography variant="caption" sx={{ color: C.muted, fontSize: 11 }}>
                        {sub}
                    </Typography>
                )}
            </Box>
        );
    };

    if (loading) {
        return (
            <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1.5, borderRadius: 2 }} />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ borderRadius: 3, mb: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWalletIcon sx={{ color: C.brand }} />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('costs.usageTitle')}
                        </Typography>
                    </Box>
                    <Chip
                        label={t('costs.autoGeneratedBadge')}
                        size="small"
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, height: 24 }}
                    />
                </Box>

                {rows.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 1 }}>
                            {t('costs.noActiveQuota')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.subtle, fontSize: 13 }}>
                            {t('costs.noActiveQuotaHint')}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Box
                            sx={{
                                p: 2,
                                mb: 2,
                                borderRadius: 2,
                                border: `1px solid ${C.brandLight}`,
                                background: 'linear-gradient(135deg, #FDF2F6 0%, #FFFFFF 100%)'
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.text, mb: 1.5 }}>
                                {t('costs.totalBudget')}
                            </Typography>
                            <Box sx={{ mb: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: C.subtle, fontWeight: 600 }}>
                                        {t('costs.budgetLabel')}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: totals.budgetPct >= 90 ? '#C95B6E' : C.text }}>
                                        ${totals.used.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${totals.budget.toLocaleString()}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={totals.budgetPct}
                                    sx={{
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: totals.budgetPct >= 90 ? '#F7DEE3' : C.brandLight,
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 6,
                                            background: totals.budgetPct >= 90
                                                ? 'linear-gradient(90deg, #C95B6E88, #C95B6E)'
                                                : `linear-gradient(90deg, ${C.brand}88, ${C.brand})`
                                        }
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: C.muted }}>
                                {t('costs.remainingBudget')}:{' '}
                                <strong>${Math.max(totals.budget - totals.used, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </Typography>
                        </Box>

                        <Grid container spacing={2}>
                            {rows.map((r) => {
                                const u = r.quota.usage ?? null;
                                return (
                                    <Grid key={r.seId} size={{ xs: 12, md: 6 }}>
                                        <Card
                                            sx={{
                                                borderRadius: 2,
                                                border: r.budgetPct >= 90 ? '2px solid #C95B6E' : `1px solid ${C.border}`,
                                                height: '100%'
                                            }}
                                        >
                                            <CardContent sx={{ pb: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 700, color: r.budgetPct >= 90 ? '#C95B6E' : C.text, mb: 1.5 }}
                                                >
                                                    {r.seLabel}
                                                </Typography>
                                                {renderBar(
                                                    t('costs.budgetLabel'),
                                                    r.usedCost,
                                                    r.quota.maxBudget,
                                                    '$',
                                                    t('costs.remainingBudget') + ': $' + Math.max(r.quota.maxBudget - r.usedCost, 0).toFixed(2)
                                                )}
                                                {u ? (
                                                    <>
                                                        {renderBar(t('quotas.cpuLabel'), u.cpu, r.quota.maxCpu, t('quotas.cores'), '')}
                                                        {renderBar(t('quotas.ramLabel'), u.ram, r.quota.maxRam, t('quotas.mb'), '')}
                                                        {renderBar(t('quotas.storageLabel'), u.storage, r.quota.maxStorage, t('quotas.gb'), '')}
                                                        {r.quota.maxPods > 0 && renderBar(t('quotas.podsLabel'), u.pods, r.quota.maxPods, '', '')}
                                                    </>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: C.muted }}>
                                                        {t('costs.noMetric')}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default BudgetUsageSection;