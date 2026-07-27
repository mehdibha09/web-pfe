import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    InputAdornment,
    Skeleton,
    TextField,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { listQuotasPaginated } from '../../../services/cloudPricerService';
import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import {
    getLatestMetric,
    listEnvironments,
    listServiceEnvironments,
    listServices
} from '../../../services/devopsService';
import { C, PAGE_BG } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import CreateQuotaForm from './CreateQuotaForm';
import QuotaCard from './QuotaCard';
import QuotasSummary from './QuotasSummary';
import { PERIODS } from './types';
import type { QuotaWithMetrics } from './types';

const QuotasPage = () => {
    const { t } = useTranslation();
    const [quotas, setQuotas] = useState<QuotaWithMetrics[]>([]);
    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [periodFilter, setPeriodFilter] = useState<string>('');
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    const load = async () => {
        setLoading(true);
        try {
            const result = await listQuotasPaginated(page, PAGE_SIZE);
            const withMetrics: QuotaWithMetrics[] = await Promise.all(
                result.items.map(async (q) => {
                    try {
                        const m = await getLatestMetric(q.serviceEnvironmentId);
                        return { ...q, metrics: m };
                    } catch {
                        return { ...q, metrics: null };
                    }
                })
            );
            setQuotas(withMetrics);
            setTotalElements(result.total);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load quotas'));
        } finally {
            setLoading(false);
        }
    };

    const loadReferences = async () => {
        try {
            const [se, sv, en] = await Promise.all([
                listServiceEnvironments(),
                listServices(),
                listEnvironments()
            ]);
            setServiceEnvironments(se);
            setServices(sv);
            setEnvironments(en);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load reference data'));
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    useEffect(() => {
        loadReferences();
    }, []);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        return quotas.filter((q) => {
            const matchSearch = !search || q.serviceEnvironmentId.toLowerCase().includes(search.toLowerCase());
            const matchPeriod = !periodFilter || q.period === periodFilter;
            return matchSearch && matchPeriod;
        });
    }, [quotas, search, periodFilter]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    return (
        <Box sx={{ p: 4, background: PAGE_BG, minHeight: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('quotas.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted }}>{t('quotas.subtitle')}</Typography>
                </Box>
                <MyCustomButton
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ px: 3 }}
                >
                    {t('quotas.newQuota')}
                </MyCustomButton>
            </Box>

            {!loading && quotas.length > 0 && <QuotasSummary quotas={quotas} />}

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder={t('quotas.searchPlaceholder')}
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
                    <Chip
                        label={t('quotas.allPeriods')}
                        size="small"
                        variant={periodFilter === '' ? 'filled' : 'outlined'}
                        onClick={() => setPeriodFilter('')}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                    />
                    {PERIODS.map((p) => (
                        <Chip
                            key={p}
                            label={t('periods.' + p)}
                            size="small"
                            variant={periodFilter === p ? 'filled' : 'outlined'}
                            onClick={() => setPeriodFilter(periodFilter === p ? '' : p)}
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
                                    <Skeleton variant="text" width="60%" height={24} />
                                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                                    {[1, 2, 3, 4].map((j) => (
                                        <Skeleton key={j} variant="rounded" height={36} sx={{ mb: 1, borderRadius: 2 }} />
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : filtered.length === 0 ? (
                <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                            {quotas.length === 0 ? t('quotas.noQuotas') : t('quotas.noResults')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2 }}>
                            {quotas.length === 0 ? t('quotas.createFirst') : t('quotas.adjustSearch')}
                        </Typography>
                        {quotas.length === 0 && (
                            <MyCustomButton startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                                {t('quotas.newQuota')}
                            </MyCustomButton>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Grid container spacing={2}>
                        {filtered.map((q) => (
                            <Grid key={q.id} size={{ xs: 12, md: 6 }}>
                                <QuotaCard
                                    quota={q}
                                    onSaved={load}
                                    serviceEnvironments={serviceEnvironments}
                                    services={services}
                                    environments={environments}
                                />
                            </Grid>
                        ))}
                    </Grid>
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <CreateQuotaForm
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={load}
                serviceEnvironments={serviceEnvironments}
                services={services}
                environments={environments}
            />
        </Box>
    );
};

export default QuotasPage;