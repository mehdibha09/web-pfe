import {
    Autorenew as AutorenewIcon,
    PauseCircle as PauseCircleIcon,
    PlayCircle as PlayCircleIcon,
    Refresh as RefreshIcon,
    Storage as StorageIcon,
    Timer as TimerIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    Grid,
    IconButton,
    LinearProgress,
    MenuItem,
    Select,
    Skeleton,
    Tooltip,
    Typography
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { getStoredUser } from '../../../services/authStorage';
import type { EnvironmentResponse, MetricResponse, ServiceEnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import {
    getLatestMetric,
    getMetricsHistory,
    listEnvironments,
    listServiceEnvironments,
    listServices
} from '../../../services/devopsService';
import { useSse as useSseStream } from '../../../hooks/useSse';
import { getAccessToken } from '../../../services/authStorage';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { formatBps, formatPct, isMetricStale, serviceEnvironmentLabel } from '../metrics/constants';
import SparkLine from '../metrics/SparkLine';

const POLL_INTERVAL_MS = 20_000;

const MonitoringTempsReelPage = () => {
    const { t } = useTranslation();
    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [selectedSeId, setSelectedSeId] = useState('');

    const [latest, setLatest] = useState<MetricResponse | null>(null);
    const [history, setHistory] = useState<MetricResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(false);

    const [pollingEnabled, setPollingEnabled] = useState(true);
    const [useSse, setUseSse] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const tenantId = getStoredUser()?.tenantId;

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const [seRes, svcRes, envRes] = await Promise.all([
                listServiceEnvironments(),
                listServices(),
                listEnvironments()
            ]);
            setServiceEnvironments(seRes);
            setServices(svcRes);
            setEnvironments(envRes);
            setCatalogError(false);
            const next = selectedSeId && seRes.some((se) => se.id === selectedSeId) ? selectedSeId : (seRes[0]?.id ?? '');
            if (next !== selectedSeId) setSelectedSeId(next);
        } catch {
            setCatalogError(true);
        } finally {
            setLoading(false);
        }
    }, [selectedSeId]);

    const loadSelection = useCallback(async (seId: string) => {
        try {
            const [latestMetric, historyMetrics] = await Promise.all([
                getLatestMetric(seId, tenantId),
                getMetricsHistory(seId, tenantId)
            ]);
            setLatest(latestMetric);
            setHistory(Array.isArray(historyMetrics) ? historyMetrics : []);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('monitoring.noMetrics')));
        }
    }, [tenantId, t]);

    useEffect(() => { loadCatalog(); }, [loadCatalog]);

    useEffect(() => {
        if (selectedSeId) loadSelection(selectedSeId);
    }, [selectedSeId, loadSelection]);

    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (pollingEnabled && !useSse && selectedSeId) {
            pollRef.current = setInterval(async () => {
                try {
                    const [latestMetric, historyMetrics] = await Promise.all([
                        getLatestMetric(selectedSeId, tenantId),
                        getMetricsHistory(selectedSeId, tenantId)
                    ]);
                    setLatest(latestMetric);
                    setHistory(Array.isArray(historyMetrics) ? historyMetrics : []);
                } catch {
                    // silent — polling shouldn't spam toasts
                }
            }, POLL_INTERVAL_MS);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [pollingEnabled, useSse, selectedSeId, tenantId]);

    const sseBaseUrl = (() => {
        const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, '');
        const host = import.meta.env.VITE_API_HOST || 'localhost';
        const port = import.meta.env.VITE_API_PORT || '6060';
        return `http://${host}:${port}`;
    })();

    const { connected: sseConnected } = useSseStream({
        url: selectedSeId ? `${sseBaseUrl}/metrics/stream/${selectedSeId}` : '',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        enabled: useSse && !!selectedSeId,
        onMessage: (data: MetricResponse) => {
            setLatest(data);
            setHistory((prev) => [...prev, data].slice(-120));
        }
    });

    const selectedLabel = useMemo(() => {
        const se = serviceEnvironments.find((s) => s.id === selectedSeId);
        if (!se) return t('monitoring.noServiceEnvSelected');
        return serviceEnvironmentLabel(se, services, environments);
    }, [selectedSeId, serviceEnvironments, services, environments, t]);

    const chartData = useMemo(() => {
        const sorted = [...history].sort(
            (a, b) =>
                new Date(a.createdAt ?? a.updatedAt ?? 0).getTime() -
                new Date(b.createdAt ?? b.updatedAt ?? 0).getTime()
        );
        return sorted.map((m) => ({
            time: new Date(m.createdAt ?? m.updatedAt ?? '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            cpu: m.cpuUsage ?? 0,
            ram: m.ramUsage ?? 0,
            network: m.networkUsage ?? 0
        }));
    }, [history]);

    const latestStale = isMetricStale(latest);

    const gaugeItems = [
        { labelKey: 'monitoring.cpu', value: latestStale ? null : latest?.cpuUsage ?? null, unit: '%', color: '#6366F1' },
        { labelKey: 'monitoring.ram', value: latestStale ? null : latest?.ramUsage ?? null, unit: '%', color: '#10B981' },
        { labelKey: 'monitoring.disk', value: latestStale ? null : latest?.diskUsage ?? null, unit: '%', color: '#F59E0B' },
        { labelKey: 'monitoring.network', value: latestStale ? null : latest?.networkUsage ?? null, unit: 'bps', color: '#EC4899' }
    ];

    const handleRefresh = useCallback(() => {
        if (selectedSeId) loadSelection(selectedSeId);
    }, [selectedSeId, loadSelection]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: 2,
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(228,71,125,0.3)'
                    }}>
                        <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{t('monitoring.title')}</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{t('monitoring.subtitle')}</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title={useSse ? t('metrics.switchToPolling') : t('metrics.switchToSse')}>
                        <IconButton
                            onClick={() => setUseSse((prev) => !prev)}
                            sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: useSse ? '#E0F1E6' : C.surface }}
                        >
                            {useSse ? <span style={{ fontSize: 18, color: '#2E7A4F' }}>⚡</span> : <TimerIcon sx={{ fontSize: 18, color: C.muted }} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={pollingEnabled ? t('monitoring.pause') : t('monitoring.resume')}>
                        <span>
                            <IconButton onClick={() => setPollingEnabled((p) => !p)}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}>
                                {pollingEnabled ? <PauseCircleIcon sx={{ fontSize: 18, color: C.brand }} /> : <PlayCircleIcon sx={{ fontSize: 18, color: C.muted }} />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton onClick={handleRefresh} disabled={loading}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}>
                                {loading ? <LoadingSpinner size={18} variant="inline" /> : <RefreshIcon sx={{ fontSize: 18, color: C.muted }} />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Chip
                        label={
                            useSse && sseConnected
                                ? t('metrics.sseRealtime')
                                : pollingEnabled && selectedSeId
                                  ? t('monitoring.autoRefresh')
                                  : t('monitoring.paused')
                        }
                        sx={(useSse && sseConnected) || (pollingEnabled && selectedSeId)
                            ? { backgroundColor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700 }
                            : { borderColor: C.border, color: C.muted, fontWeight: 700 }}
                        variant={(useSse && sseConnected) || (pollingEnabled && selectedSeId) ? 'filled' : 'outlined'}
                        icon={(useSse && sseConnected) || (pollingEnabled && selectedSeId) ? <AutorenewIcon sx={{ fontSize: 14 }} /> : undefined}
                    />
                </Box>
            </Box>

            {catalogError && (
                <Card sx={{ borderRadius: 3, mb: 3, bgcolor: '#FFF8F8', border: `1px solid ${C.border}` }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{t('monitoring.noMetrics')}</Typography>
                    </CardContent>
                </Card>
            )}

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <CardContent>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                        {t('monitoring.serviceEnvironment')}
                    </Typography>
                    {loading && serviceEnvironments.length === 0 ? (
                        <Skeleton width="60%" />
                    ) : (
                        <FormControl fullWidth size="small">
                            <Select value={selectedSeId} onChange={(e) => setSelectedSeId(String(e.target.value))} displayEmpty
                                sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border } }}>
                                <MenuItem value="" disabled>{t('monitoring.selectServiceEnv')}</MenuItem>
                                {serviceEnvironments.map((se) => (
                                    <MenuItem key={se.id} value={se.id}>{serviceEnvironmentLabel(se, services, environments)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </CardContent>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                {gaugeItems.map((item) => (
                    <Card key={item.labelKey} sx={{
                        borderRadius: 3,
                        border: `1px solid ${item.color}22`,
                        background: `linear-gradient(135deg, ${item.color}12 0%, #FFFFFF 100%)`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                        <CardContent>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t(item.labelKey)}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1F2937', mt: 0.5 }}>
                                {item.value === null || item.value === undefined
                                    ? '—'
                                    : item.unit === 'bps'
                                      ? formatBps(item.value)
                                      : item.value.toFixed(1) + item.unit}
                            </Typography>
                            {item.unit === '%' && item.value !== null && (
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, item.value)}
                                    sx={{
                                        mt: 1.5, height: 6, borderRadius: 3, backgroundColor: item.color + '18',
                                        '& .MuiLinearProgress-bar': { backgroundColor: item.value >= 85 ? '#EF4444' : item.value >= 60 ? '#F59E0B' : item.color, borderRadius: 3 }
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {([
                    { key: 'cpu', labelKey: 'monitoring.cpuUsage', color: '#6366F1', unit: '%' },
                    { key: 'ram', labelKey: 'monitoring.ramUsage', color: '#10B981', unit: '%' }
                ] as const).map((chart) => (
                    <Grid key={chart.key} size={{ xs: 12, md: 6 }}>
                        <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: `0 4px 16px ${chart.color}14`, overflow: 'hidden' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{ width: 3, height: 18, borderRadius: 2, backgroundColor: chart.color }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{t(chart.labelKey)}</Typography>
                                    <Typography sx={{ ml: 'auto', fontSize: 11, color: '#9CA3AF' }}>{chartData.length > 0 && `${chartData.length} pts`}</Typography>
                                </Box>
                                {loading && chartData.length === 0 ? (
                                    <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2 }} />
                                ) : chartData.length === 0 ? (
                                    <Typography sx={{ color: C.muted, textAlign: 'center', py: 6 }}>
                                        {selectedSeId ? t('monitoring.noMetrics') : t('monitoring.selectDeploymentHint')}
                                    </Typography>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography sx={{ fontWeight: 900, fontSize: 42, color: chart.color, lineHeight: 1, whiteSpace: 'nowrap' }}>
                                            {chart.key === 'cpu'
                                                ? latestStale ? '—' : (latest?.cpuUsage ?? 0).toFixed(0) + '%'
                                                : latestStale ? '—' : (latest?.ramUsage ?? 0).toFixed(0) + '%'}
                                        </Typography>
                                        <Box sx={{ flex: 1, minWidth: 0, '& svg': { width: '100%', height: 70, display: 'block' } }}>
                                            <SparkLine points={chartData.map((d) => d[chart.key] ?? 0)} color={chart.color} />
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('monitoring.latestSamples')}</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>{t('monitoring.sampleCount', { count: history.length })}</Typography>
                    </Box>
                    <Divider sx={{ mb: 2, borderColor: C.border }} />
                    {history.length === 0 ? (
                        <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>
                            {selectedSeId ? t('monitoring.noMetrics') : t('monitoring.selectDeploymentHint')}
                        </Typography>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {[t('common.date'), t('monitoring.cpu'), t('monitoring.ram'), t('monitoring.disk'), t('monitoring.network')].map((h) => (
                                            <th key={h} style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: C.subtle, letterSpacing: 0.5, padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...history].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 15).map((m, idx) => (
                                        <tr key={m.id ?? idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', color: C.text }}>
                                                {new Date(m.createdAt ?? m.updatedAt ?? '').toLocaleString()}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#6366F1' }}>{formatPct(m.cpuUsage)}</td>
                                            <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#10B981' }}>{formatPct(m.ramUsage)}</td>
                                            <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>{formatPct(m.diskUsage)}</td>
                                            <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#EC4899' }}>{formatBps(m.networkUsage)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default MonitoringTempsReelPage;
