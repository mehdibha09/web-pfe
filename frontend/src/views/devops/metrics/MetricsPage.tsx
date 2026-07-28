import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import TimerIcon from '@mui/icons-material/Timer';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Tooltip,
    Typography
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAccessToken } from '../../../services/authStorage';
import { useSse } from '../../../hooks/useSse';

import type {
    EnvironmentResponse,
    MetricResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import {
    getLatestMetric,
    getMetricsHistory,
    getMetricsSummary,
    listEnvironments,
    listMetrics,
    listServiceEnvironments,
    listServices
} from '../../../services/devopsService';
import MetricSnapshotCard from './MetricSnapshotCard';
import MetricTable from './MetricTable';
import MetricTrendCard from './MetricTrendCard';
import {
    C,
    computeSummaryFromHistory,
    formatPct,
    normalizeSummary,
    ROWS_PER_PAGE,
    serviceEnvironmentLabel
} from './constants';

import type { MetricSummary } from './constants';

const MetricsPage = () => {
    const { t } = useTranslation();
    const [serviceEnvironmentId, setServiceEnvironmentId] = useState('');

    const [loading, setLoading] = useState(false);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [catalogError, setCatalogError] = useState(false);

    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [allMetrics, setAllMetrics] = useState<MetricResponse[]>([]);

    const [latest, setLatest] = useState<MetricResponse | null>(null);
    const [history, setHistory] = useState<MetricResponse[]>([]);
    const [summary, setSummary] = useState<MetricSummary | null>(null);
    const [summarySource, setSummarySource] = useState<'api' | 'computed' | 'none'>('none');

    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    // ── Polling ──
    const [pollingEnabled, setPollingEnabled] = useState(true);
    const [pollingInterval, setPollingInterval] = useState(10_000);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── SSE mode ──
    const [useSseEnabled, setUseSseEnabled] = useState(false);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const [relations, serviceList, envList, metricsResponse] = await Promise.all([
                listServiceEnvironments(),
                listServices(),
                listEnvironments(),
                listMetrics()
            ]);
            const metrics = Array.isArray(metricsResponse)
                ? metricsResponse
                : ((metricsResponse as any)?.data ??
                  (metricsResponse as any)?.content ??
                  (metricsResponse as any)?.items ??
                  []);
            setServiceEnvironments(relations);
            setServices(serviceList);
            setEnvironments(envList);
            setAllMetrics(metrics);

            const nextSelection =
                serviceEnvironmentId && relations.some((relation) => relation.id === serviceEnvironmentId)
                    ? serviceEnvironmentId
                    : (relations[0]?.id ?? '');

            if (nextSelection !== serviceEnvironmentId) {
                setServiceEnvironmentId(nextSelection);
            }
        } catch {
            setCatalogError(true);
            setAllMetrics([]);
            setServiceEnvironments([]);
            setServices([]);
            setEnvironments([]);
        } finally {
            setLoading(false);
        }
    }, [serviceEnvironmentId]);

    const loadSelection = useCallback(async (id: string) => {
        setSelectionLoading(true);
        try {
            const [latestMetric, historyMetrics, summaryMetric] = await Promise.all([
                getLatestMetric(id),
                getMetricsHistory(id),
                getMetricsSummary(id)
            ]);

            setLatest(latestMetric);
            setHistory(historyMetrics);
            const normalizedSummary = normalizeSummary(summaryMetric);
            const computedSummary = computeSummaryFromHistory(historyMetrics);

            if (normalizedSummary) {
                setSummary(normalizedSummary);
                setSummarySource('api');
            } else if (computedSummary) {
                setSummary(computedSummary);
                setSummarySource('computed');
            } else {
                setSummary(null);
                setSummarySource('none');
            }
        } catch {
            setLatest(null);
            setHistory([]);
            setSummary(null);
            setSummarySource('none');
        } finally {
            setSelectionLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCatalog();
    }, [loadCatalog]);

    useEffect(() => {
        if (serviceEnvironmentId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadSelection(serviceEnvironmentId);
        }
    }, [loadSelection, serviceEnvironmentId]);

    // ── Polling logic ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        if (pollingEnabled && serviceEnvironmentId) {
            pollingRef.current = setInterval(async () => {
                try {
                    const [latestMetric, historyMetrics, summaryMetric] = await Promise.all([
                        getLatestMetric(serviceEnvironmentId),
                        getMetricsHistory(serviceEnvironmentId),
                        getMetricsSummary(serviceEnvironmentId)
                    ]);
                    setLatest(latestMetric);
                    setHistory(historyMetrics);
                    const normalizedSummary = normalizeSummary(summaryMetric);
                    const computedSummary = computeSummaryFromHistory(historyMetrics);
                    if (normalizedSummary) {
                        setSummary(normalizedSummary);
                        setSummarySource('api');
                    } else if (computedSummary) {
                        setSummary(computedSummary);
                        setSummarySource('computed');
                    }
                } catch {
                    // silent — polling shouldn't spam toasts
                }
            }, pollingInterval);
        }

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [pollingEnabled, pollingInterval, serviceEnvironmentId]);

    // ── SSE real-time metrics ──
    const sseBaseUrl = (() => {
        const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, '');
        const host = import.meta.env.VITE_API_HOST || 'localhost';
        const port = import.meta.env.VITE_API_PORT || '6060';
        return `http://${host}:${port}`;
    })();

    const { connected: sseConnected } = useSse({
        url: serviceEnvironmentId ? `${sseBaseUrl}/metrics/stream/${serviceEnvironmentId}` : '',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        enabled: useSseEnabled && !!serviceEnvironmentId,
        onMessage: (data: MetricResponse) => {
            setLatest(data);
            setHistory((prev) => [...prev, data].slice(-100));
        }
    });

    const selectedRelation = useMemo(
        () => serviceEnvironments.find((relation) => relation.id === serviceEnvironmentId) ?? null,
        [serviceEnvironmentId, serviceEnvironments]
    );

    const selectedRelationLabel = useMemo(() => {
        if (!selectedRelation) return t('metrics.noServiceEnvSelected');
        return serviceEnvironmentLabel(selectedRelation, services, environments);
    }, [selectedRelation, services, environments, t]);

    const selectedHistory = useMemo(
        () =>
            [...history].sort(
                (a, b) =>
                    new Date(a.createdAt ?? a.updatedAt ?? 0).getTime() -
                    new Date(b.createdAt ?? b.updatedAt ?? 0).getTime()
            ),
        [history]
    );

    const SPARKLINE_WINDOW = 50;

    const cpuPoints = useMemo(() => selectedHistory.slice(-SPARKLINE_WINDOW).map((metric) => metric.cpuUsage ?? 0), [selectedHistory]);
    const ramPoints = useMemo(() => selectedHistory.slice(-SPARKLINE_WINDOW).map((metric) => metric.ramUsage ?? 0), [selectedHistory]);
    const netPoints = useMemo(() => selectedHistory.slice(-SPARKLINE_WINDOW).map((metric) => metric.networkUsage ?? 0), [selectedHistory]);

    // ── Filtrage (recherche texte + plage de dates) ────────────────────────────
    const filteredMetrics = useMemo(() => {
        const q = search.trim().toLowerCase();
        const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
        const toTime = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null; // fin de journée incluse

        let items = [...allMetrics].sort(
            (a, b) =>
                new Date(b.createdAt ?? b.updatedAt ?? 0).getTime() -
                new Date(a.createdAt ?? a.updatedAt ?? 0).getTime()
        );

        if (fromTime !== null || toTime !== null) {
            items = items.filter((metric) => {
                const t = new Date(metric.createdAt ?? metric.updatedAt ?? 0).getTime();
                if (fromTime !== null && t < fromTime) return false;
                if (toTime !== null && t > toTime) return false;
                return true;
            });
        }

        if (q) {
            items = items.filter((metric) => {
                const relation = serviceEnvironments.find((item) => item.id === metric.serviceEnvironmentId);
                const relationName = relation
                    ? serviceEnvironmentLabel(relation, services, environments)
                    : metric.serviceEnvironmentId;

                return [
                    metric.id,
                    metric.serviceEnvironmentId,
                    relationName,
                    metric.cpuUsage,
                    metric.ramUsage,
                    metric.networkUsage,
                    metric.diskUsage,
                    metric.pods
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(q);
            });
        }

        return items;
    }, [allMetrics, dateFrom, dateTo, environments, search, serviceEnvironments, services]);

    // ── Pagination client-side ──────────────────────────────────────────────────
    const pageCount = Math.max(1, Math.ceil(filteredMetrics.length / ROWS_PER_PAGE));

    useEffect(() => {
        setPage(1);
    }, [search, dateFrom, dateTo]);

    const visibleMetrics = useMemo(
        () => filteredMetrics.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
        [filteredMetrics, page]
    );

    const diskPct = useMemo(() => {
        const v = latest?.diskUsage ?? 0;
        return Math.max(0, Math.min(100, v));
    }, [latest?.diskUsage]);

    const selectedMetricsCount = useMemo(
        () => allMetrics.filter((metric) => metric.serviceEnvironmentId === serviceEnvironmentId).length,
        [allMetrics, serviceEnvironmentId]
    );

    const hasActiveFilters = Boolean(search || dateFrom || dateTo);

    const clearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
    };

    const handleRefresh = async () => {
        const currentSelection = serviceEnvironmentId;
        await loadCatalog();
        if (currentSelection) {
            await loadSelection(currentSelection);
        }
    };

    const metricCardSx = {
        borderRadius: 3,
        border: `1px solid ${C.border}`,
        backgroundColor: C.surface,
        boxShadow: '0 2px 8px rgba(228,71,125,0.06)'
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                background: `linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)`,
                minHeight: '100%'
            }}
        >
            {/* ── Header ── */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(228,71,125,0.3)'
                        }}
                    >
                        <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                            {t('metrics.title')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>
                            {t('metrics.subtitle')}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={useSseEnabled ? t('metrics.switchToPolling') : t('metrics.switchToSse')}>
                        <IconButton
                            onClick={() => setUseSseEnabled((prev) => !prev)}
                            sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: useSseEnabled ? '#E0F1E6' : C.surface }}
                        >
                            {useSseEnabled ? (
                                <span style={{ fontSize: 18, color: '#2E7A4F' }}>⚡</span>
                            ) : (
                                <TimerIcon sx={{ fontSize: 18, color: C.muted }} />
                            )}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={pollingEnabled ? t('metrics.pauseAutoRefresh') : t('metrics.resumeAutoRefresh')}>
                        <IconButton
                            onClick={() => setPollingEnabled((prev) => !prev)}
                            sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}
                        >
                            {pollingEnabled ? (
                                <PauseCircleIcon sx={{ fontSize: 18, color: C.brand }} />
                            ) : (
                                <PlayCircleIcon sx={{ fontSize: 18, color: C.muted }} />
                            )}
                        </IconButton>
                    </Tooltip>

                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={pollingInterval}
                            onChange={(e) => setPollingInterval(Number(e.target.value))}
                            sx={{ fontSize: 12, height: 36 }}
                        >
                            <MenuItem value={5_000}>5s</MenuItem>
                            <MenuItem value={10_000}>10s</MenuItem>
                            <MenuItem value={30_000}>30s</MenuItem>
                            <MenuItem value={60_000}>60s</MenuItem>
                        </Select>
                    </FormControl>

                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton
                                onClick={handleRefresh}
                                disabled={loading || selectionLoading}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}
                            >
                                {loading || selectionLoading ? (
                                    <LoadingSpinner size={18} variant="inline" />
                                ) : (
                                    <RefreshIcon sx={{ fontSize: 18, color: C.muted }} />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Chip
                        label={
                            useSseEnabled && sseConnected
                                ? t('metrics.sseRealtime')
                                : useSseEnabled && serviceEnvironmentId
                                  ? t('metrics.sseReconnecting')
                                  : pollingEnabled && serviceEnvironmentId
                                    ? t('metrics.liveAutoRefresh')
                                    : serviceEnvironmentId
                                      ? t('metrics.paused')
                                      : t('metrics.noSelection')
                        }
                        sx={
                            (useSseEnabled && sseConnected) || (pollingEnabled && serviceEnvironmentId)
                                ? { backgroundColor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700 }
                                : { borderColor: C.border, color: C.muted, fontWeight: 700 }
                        }
                        variant={(useSseEnabled && sseConnected) || (pollingEnabled && serviceEnvironmentId) ? 'filled' : 'outlined'}
                        icon={
                            (useSseEnabled && sseConnected) || (pollingEnabled && serviceEnvironmentId) ? (
                                <TimerIcon sx={{ fontSize: 14 }} />
                            ) : undefined
                        }
                    />
                </Box>
            </Box>

            {catalogError && (
                <Card sx={{ ...metricCardSx, mb: 3, bgcolor: '#FFF8F8' }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>
                            {t('metrics.noDataYet')}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* ── KPI cards ── */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2, minmax(0, 1fr))',
                        xl: 'repeat(4, minmax(0, 1fr))'
                    },
                    gap: 2,
                    mb: 3
                }}
            >
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Typography variant="overline" sx={{ color: C.subtle, fontWeight: 700 }}>
                            {t('metrics.selectedRelation')}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, color: C.text, mt: 0.5 }}>
                            {selectedRelationLabel}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={metricCardSx}>
                    <CardContent>
                        <Typography variant="overline" sx={{ color: C.subtle, fontWeight: 700 }}>
                            {t('metrics.latestCpu')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.brand, mt: 0.25 }}>
                            {formatPct(latest?.cpuUsage)}
                        </Typography>
                        <Typography sx={{ color: C.muted }}>{t('metrics.ramLabel')} {formatPct(latest?.ramUsage)}</Typography>
                    </CardContent>
                </Card>

                <Card sx={metricCardSx}>
                    <CardContent>
                        <Typography variant="overline" sx={{ color: C.subtle, fontWeight: 700 }}>
                            {t('metrics.records')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, mt: 0.25 }}>
                            {selectedMetricsCount}
                        </Typography>
                        <Typography sx={{ color: C.muted }}>{t('metrics.forSelectedEnv')}</Typography>
                    </CardContent>
                </Card>

                <Card sx={metricCardSx}>
                    <CardContent>
                        <Typography variant="overline" sx={{ color: C.subtle, fontWeight: 700 }}>
                            {t('metrics.totalMetrics')}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, mt: 0.25 }}>
                            {allMetrics.length}
                        </Typography>
                        <Typography sx={{ color: C.muted }}>{t('metrics.acrossAll')}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* ── Data scope selector ── */}
            <Card sx={{ ...metricCardSx, mb: 3 }}>
                <CardContent>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                            flexWrap: 'wrap'
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                {t('metrics.dataScope')}
                            </Typography>
                            <Typography sx={{ color: C.muted, mt: 0.25 }}>
                                {t('metrics.dataScopeHint')}
                            </Typography>
                        </Box>

                        <Chip
                            label={selectedRelationLabel}
                            sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                        />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: C.border }} />

                    <Select
                        value={serviceEnvironmentId}
                        onChange={(e) => setServiceEnvironmentId(String(e.target.value))}
                        size="small"
                        fullWidth
                        sx={{ backgroundColor: '#fff', maxWidth: { md: 420 } }}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            {t('metrics.selectServiceEnv')}
                        </MenuItem>
                        {serviceEnvironments.map((relation) => (
                            <MenuItem key={relation.id} value={relation.id}>
                                {serviceEnvironmentLabel(relation, services, environments)}
                            </MenuItem>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            {/* ── Trend overview + snapshot/summary ── */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' },
                    gap: 2,
                    alignItems: 'start',
                    mb: 3
                }}
            >
                <MetricTrendCard
                    selectedHistory={selectedHistory}
                    cpuPoints={cpuPoints}
                    ramPoints={ramPoints}
                    netPoints={netPoints}
                    latest={latest}
                    selectionLoading={selectionLoading}
                />

                <MetricSnapshotCard
                    latest={latest}
                    selectionLoading={selectionLoading}
                    summary={summary}
                    summarySource={summarySource}
                    diskPct={diskPct}
                />
            </Box>

            {/* ── All metrics table ── */}
            <MetricTable
                filteredMetrics={filteredMetrics}
                visibleMetrics={visibleMetrics}
                pageCount={pageCount}
                page={page}
                onPageChange={setPage}
                search={search}
                onSearchChange={setSearch}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                serviceEnvironments={serviceEnvironments}
                services={services}
                environments={environments}
            />

            {loading && !serviceEnvironments.length && (
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Typography sx={{ color: C.muted }}>{t('metrics.loading')}</Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default MetricsPage;
