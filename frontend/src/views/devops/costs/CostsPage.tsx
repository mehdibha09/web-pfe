import SearchIcon from '@mui/icons-material/Search';
import ComputeIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkIcon from '@mui/icons-material/Hub';
import ReceiptIcon from '@mui/icons-material/Receipt';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    IconButton,
    InputAdornment,
    Skeleton,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { CostRecordResponse } from '../../../services/cloudPricerService';
import { generateCostsNow, listCosts, listCostsPaginated } from '../../../services/cloudPricerService';
import { canManageCosts } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';
import { exportToCSV, exportToPDF } from './exportUtils';
import { C, PAGE_BG } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { formatMoney } from '../../../utils/format';
import { type PeriodFilter, getPeriodRange } from './constants';
import PaginationBar from '../../../components/PaginationBar';
import BudgetUsageSection from './BudgetUsageSection';
import CostCard from './CostCard';
import CostCharts from './CostCharts';
import ForecastCard from './ForecastCard';
import ModeComparisonCard from './ModeComparisonCard';
import MonthComparisonCard from './MonthComparisonCard';
import { seLabel } from '../common/seLabel';
import {
    listServiceEnvironments,
    listServices,
    listEnvironments
} from '../../../services/devopsService';

const KPI_ICONS = [
    { Icon: ReceiptIcon, color: '#BE185D' },
    { Icon: ComputeIcon, color: '#2E5C8A' },
    { Icon: StorageIcon, color: '#8A6A2E' },
    { Icon: NetworkIcon, color: '#065F46' }
];

const CostsPage = () => {
    const { t, i18n } = useTranslation();
    const langCurrency = i18n.language?.startsWith('fr') ? 'EUR' : 'USD';
    const [costs, setCosts] = useState<CostRecordResponse[]>([]);
    const [allCosts, setAllCosts] = useState<CostRecordResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
    const [search, setSearch] = useState('');
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [seNames, setSeNames] = useState<Record<string, string>>({});
    const PAGE_SIZE = 10;

    useEffect(() => {
        (async () => {
            try {
                const [seRes, svcRes, envRes] = await Promise.all([
                    listServiceEnvironments(),
                    listServices(),
                    listEnvironments()
                ]);
                const labels: Record<string, string> = {};
                for (const se of seRes) {
                    labels[se.id] = seLabel(se, svcRes, envRes);
                }
                setSeNames(labels);
            } catch {
                // non-blocking
            }
        })();
    }, []);

    const handleCostGenerate = async () => {
        setGenerating(true);
        try {
            await generateCostsNow();
            toast.success(t('costs.generateTriggered'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('costs.failedToLoad')));
        } finally {
            setGenerating(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const result = await listCostsPaginated(page, PAGE_SIZE);
            setCosts(result.items);
            setTotalElements(result.total);
            setAllCosts(await listCosts());
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('costs.failedToLoad')));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filteredCosts = useMemo(() => {
        let result = costs;
        if (periodFilter !== 'all') {
            const { start, end } = getPeriodRange(periodFilter);
            result = result.filter(c => {
                const pStart = new Date(c.periodStart);
                return pStart >= start && pStart <= end;
            });
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(c => {
                const seName = (seNames[c.serviceEnvironmentId] ?? '').toLowerCase();
                return (
                    c.serviceEnvironmentId.toLowerCase().includes(q) ||
                    seName.includes(q) ||
                    c.mode.toLowerCase().includes(q) ||
                    new Date(c.periodStart).toLocaleDateString().includes(q)
                );
            });
        }
        return result;
    }, [costs, periodFilter, search, seNames]);

    // Full history filtered by period only (not paginated, not search) for KPIs/charts
    const periodAllCosts = useMemo(() => {
        if (periodFilter === 'all') return allCosts;
        const { start, end } = getPeriodRange(periodFilter);
        return allCosts.filter(c => {
            const pStart = new Date(c.periodStart);
            return pStart >= start && pStart <= end;
        });
    }, [allCosts, periodFilter]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const totals = useMemo(() => {
        let totalCost = 0, compute = 0, storage = 0, network = 0, backup = 0, os = 0;
        for (const c of periodAllCosts) {
            totalCost += c.totalCost;
            compute += c.computeCost;
            storage += c.storageCost;
            network += c.networkCost;
            backup += c.backupCost;
            os += c.osCost;
        }
        return { totalCost, compute, storage, network, backup, os };
    }, [periodAllCosts]);

    const kpiCards = [
        { label: t('costs.totalCost'), value: totals.totalCost, bg: '#FCE7F3', color: '#BE185D', icon: KPI_ICONS[0] },
        { label: t('costs.computeCost'), value: totals.compute, bg: '#E4EEF7', color: '#2E5C8A', icon: KPI_ICONS[1] },
        { label: t('costs.storageCost'), value: totals.storage, bg: '#F7ECD6', color: '#8A6A2E', icon: KPI_ICONS[2] },
        { label: t('costs.networkCost'), value: totals.network, bg: '#D1FAE5', color: '#065F46', icon: KPI_ICONS[3] }
    ];

    return (
        <Box sx={{ p: 4, background: PAGE_BG, minHeight: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('costs.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted }}>{t('costs.subtitle')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {canManageCosts(getStoredUser()!) && (
                        <Tooltip title={t('costs.generateTitle')!}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handleCostGenerate}
                                disabled={generating}
                                sx={{ borderRadius: 2, color: C.brand, borderColor: C.brandLight, fontWeight: 700 }}
                            >
                                {generating ? t('costs.generating') : t('costs.generateDev')}
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title={t('costs.exportCsv')!}>
                        <IconButton
                            size="small"
                            onClick={() => exportToCSV(filteredCosts, t)}
                            sx={{ borderRadius: 2, border: `1px solid ${C.border}`, color: C.muted }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>CSV</Typography>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('costs.exportPdf')!}>
                        <IconButton
                            size="small"
                            onClick={() => exportToPDF(filteredCosts, t, langCurrency)}
                            sx={{ borderRadius: 2, border: `1px solid ${C.border}`, color: C.muted }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>PDF</Typography>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <BudgetUsageSection />

            {!loading && filteredCosts.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {kpiCards.map((kpi) => (
                        <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    backgroundColor: kpi.bg,
                                    border: `1px solid ${kpi.color}22`,
                                    transition: '0.2s',
                                    '&:hover': { translate: '0 -2px' }
                                }}
                            >
<CardContent sx={{ py: 2, px: 2.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="h4" sx={{ fontWeight: 900, color: kpi.color }}>
                                                    {formatMoney(kpi.value)}
                                                </Typography>
                                                <Typography sx={{ color: kpi.color, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                                    {kpi.label}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: 34, height: 34, borderRadius: 2, backgroundColor: kpi.bg, border: `1px solid ${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {(() => { const Icon = kpi.icon.Icon; return <Icon sx={{ fontSize: 20, color: kpi.icon.color }} />; })()}
                                            </Box>
                                        </Box>
                                    </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {!loading && costs.length > 0 && (
                <MonthComparisonCard costs={costs} />
            )}

            {!loading && periodAllCosts.length > 0 && (
                <ModeComparisonCard costs={periodAllCosts} />
            )}

            {!loading && filteredCosts.length > 0 && (
                <CostCharts
                    costs={periodAllCosts}
                    totals={totals}
                    periodFilter={periodFilter}
                    onPeriodFilterChange={setPeriodFilter}
                />
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder={t('costs.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: C.subtle, fontSize: 20 }} />
                                </InputAdornment>
                            )
                        }
                    }}
                    sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, background: C.surface } }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(['today', 'week', 'month', 'year', 'all'] as PeriodFilter[]).map((p) => (
                        <Chip
                            key={p}
                            label={t(`costs.periodFilter_${p}` as any, p)}
                            size="small"
                            variant={periodFilter === p ? 'filled' : 'outlined'}
                            onClick={() => setPeriodFilter(periodFilter === p ? 'all' : p)}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                        />
                    ))}
                </Box>
            </Box>

            {loading ? (
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid key={i} size={{ xs: 12, md: 6 }}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Skeleton variant="text" width="40%" height={24} />
                                    <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                                    <Skeleton variant="text" width="80%" height={20} />
                                    <Skeleton variant="text" width="50%" height={20} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : filteredCosts.length === 0 ? (
                <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                            {costs.length === 0 ? t('costs.noRecords') : t('costs.noResults')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2 }}>
                            {costs.length === 0 ? t('costs.autoGeneratedHint') : t('costs.adjustSearch')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {filteredCosts.map((c) => (
                            <CostCard
                                key={c.id}
                                cost={c}
                                isExpanded={expandedId === c.id}
                                onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            />
                        ))}
                    </Grid>
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <ForecastCard />
        </Box>
    );
};

export default CostsPage;