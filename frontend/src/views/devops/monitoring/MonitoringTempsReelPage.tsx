import {
    Autorenew as AutorenewIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Info as EventsIcon,
    PauseCircle as PauseCircleIcon,
    PlayCircle as PlayCircleIcon,
    Refresh as RefreshIcon,
    RestartAlt as RestartAltIcon,
    Scale as ScaleIcon,
    Terminal as TerminalIcon,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

import { getStoredUser } from '../../../services/authStorage';
import type { MetricResponse } from '../../../services/devopsService';
import {
    getLatestMetric,
    getMetricsHistory,
    getPrometheusStatus,
    prometheusQuery,
    prometheusRangeQuery
} from '../../../services/devopsService';
import type { K8sDeployment, K8sPod } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { MAX_REPLICAS, POD_STATUS_COLORS } from '../k8s/constants';

type DataSource = 'db' | 'prometheus' | 'checking';

const formatPct = (v?: number | null) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '-');

const podsEqual = (a: K8sPod[], b: K8sPod[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].name !== b[i].name || a[i].status !== b[i].status) return false;
    }
    return true;
};

const chartDataEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].time !== b[i].time || a[i].cpu !== b[i].cpu || a[i].ram !== b[i].ram) return false;
    }
    return true;
};

const CustomTooltip = ({ active, payload, label, color }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: `1px solid #E5E7EB`,
            borderRadius: 2,
            px: 1.5,
            py: 1,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
            <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 0.5 }}>{label}</Typography>
            {payload.map((entry: any, i: number) => (
                <Typography key={i} sx={{ fontSize: 13, fontWeight: 700, color: entry.color }}>
                    {entry.name}: {Number(entry.value).toFixed(1)}%
                </Typography>
            ))}
        </Box>
    );
};

const CpuChart = memo(({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#6366F1" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <filter id="cpuGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={32} unit="%" />
            <RechartsTooltip content={<CustomTooltip color="#6366F1" />} cursor={{ stroke: '#6366F1', strokeDasharray: '3 3', strokeOpacity: 0.4 }} />
            <ReferenceLine y={0} stroke="#F3F4F6" />
            <Area type="monotone" dataKey="cpu" stroke="#6366F1" strokeWidth={2.5} fill="url(#cpuGrad)" dot={false} activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
    </ResponsiveContainer>
), (prev, next) => chartDataEqual(prev.data, next.data));

const RamChart = memo(({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#10B981" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <filter id="ramGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={32} unit="%" />
            <RechartsTooltip content={<CustomTooltip color="#10B981" />} cursor={{ stroke: '#10B981', strokeDasharray: '3 3', strokeOpacity: 0.4 }} />
            <ReferenceLine y={0} stroke="#F3F4F6" />
            <Area type="monotone" dataKey="ram" stroke="#10B981" strokeWidth={2.5} fill="url(#ramGrad)" dot={false} activeDot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
    </ResponsiveContainer>
), (prev, next) => chartDataEqual(prev.data, next.data));

const MonitoringTempsReelPage = () => {
    const { t } = useTranslation();
    const [deployments, setDeployments] = useState<K8sDeployment[]>([]);
    const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
    const [deployLoading, setDeployLoading] = useState(true);

    const [latest, setLatest] = useState<MetricResponse | null>(null);
    const [history, setHistory] = useState<MetricResponse[]>([]);
    const [pods, setPods] = useState<K8sPod[]>([]);
    const [podsLoading, setPodsLoading] = useState(false);
    const [metricsLoading, setMetricsLoading] = useState(false);

    const [dataSource, setDataSource] = useState<DataSource>('checking');
    const [pollingEnabled, setPollingEnabled] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const podsRef = useRef<K8sPod[]>([]);
    const chartDataRef = useRef<any[]>([]);

    const [scaleTarget, setScaleTarget] = useState<K8sDeployment | null>(null);
    const [scaleReplicas, setScaleReplicas] = useState(1);
    const [logsTarget, setLogsTarget] = useState<K8sDeployment | null>(null);
    const [logsData, setLogsData] = useState('');
    const [logsLoading, setLogsLoading] = useState(false);
    const [eventsTarget, setEventsTarget] = useState<K8sDeployment | null>(null);
    const [eventsData, setEventsData] = useState('');
    const [eventsLoading, setEventsLoading] = useState(false);

    const loadDeployments = useCallback(async () => {
        setDeployLoading(true);
        try {
            const user = getStoredUser();
            const data = await k8sService.getAll(user?.tenantId);
            setDeployments(data);
            if (!selectedDeploymentId && data.length > 0) {
                setSelectedDeploymentId(data[0].id);
            }
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load deployments'));
        } finally {
            setDeployLoading(false);
        }
    }, []);

    useEffect(() => { loadDeployments(); }, []);

    useEffect(() => {
        getPrometheusStatus()
            .then((s) => setDataSource(s.reachable ? 'prometheus' : 'db'))
            .catch(() => setDataSource('db'));
    }, []);

    const selectedDeployment = useMemo(
        () => deployments.find((d) => d.id === selectedDeploymentId) ?? null,
        [deployments, selectedDeploymentId]
    );

    const promCpuQuery = (name: string) =>
        `sum(rate(container_cpu_usage_seconds_total{container!="",namespace="app-pfe",pod=~"${name}-[a-z0-9]+-[a-z0-9]+"}[1m])) by (pod) * 100`;

    const promMemUsageQuery = (name: string) =>
        `sum(container_memory_working_set_bytes{container!="",namespace="app-pfe",pod=~"${name}-[a-z0-9]+-[a-z0-9]+"}) by (pod)`;

    const promMemLimitQuery = (name: string) =>
        `sum(kube_pod_container_resource_limits{resource="memory",namespace="app-pfe",pod=~"${name}-[a-z0-9]+-[a-z0-9]+"}) by (pod)`;

    const parseSeries = (result: any, field: string, transform?: (v: number) => number) => {
        const series = result?.data?.result ?? [];
        return series.flatMap((r: any) =>
            (r.values ?? []).map(([ts, val]: [number, string]) => ({
                time: new Date(ts * 1000).toLocaleTimeString(),
                [field]: transform ? transform(parseFloat(val)) : parseFloat(val)
            }))
        );
    };

    const fetchPromMetrics = useCallback(async (dep: K8sDeployment, rangeStart: number, rangeEnd: number) => {
        const [cpuRes, memUsageRes, memLimitRes] = await Promise.all([
            prometheusRangeQuery(promCpuQuery(dep.name), String(rangeStart), String(rangeEnd)),
            prometheusRangeQuery(promMemUsageQuery(dep.name), String(rangeStart), String(rangeEnd)),
            prometheusRangeQuery(promMemLimitQuery(dep.name), String(rangeStart), String(rangeEnd))
        ]);
        const cpuData = parseSeries(cpuRes, 'cpu');
        const memUsageData = parseSeries(memUsageRes, 'ramBytes');
        const memLimitData = parseSeries(memLimitRes, 'ramLimit');
        const merged = cpuData.map((p: any, i: number) => ({
            time: p.time,
            cpu: p.cpu || 0,
            ram: memUsageData[i] && memLimitData[i] && memLimitData[i].ramLimit
                ? (memUsageData[i].ramBytes / memLimitData[i].ramLimit) * 100
                : memUsageData[i]?.ramBytes
                    ? memUsageData[i].ramBytes / 1_048_576
                    : 0
        }));
        let lastCpu = 0, lastMemUsage = 0, lastMemLimit = 0;
        if (cpuData.length > 0) {
            const last = cpuData.length - 1;
            lastCpu = cpuData[last].cpu || 0;
            lastMemUsage = memUsageData.length > 0 ? memUsageData[Math.min(last, memUsageData.length - 1)].ramBytes : 0;
            lastMemLimit = memLimitData.length > 0 ? memLimitData[Math.min(last, memLimitData.length - 1)].ramLimit : 0;
        }
        return { merged, latest: { cpuUsage: lastCpu, ramUsage: lastMemLimit ? (lastMemUsage / lastMemLimit) * 100 : lastMemUsage / 1_048_576 } as any };
    }, []);

    const loadMetrics = useCallback(async (deploymentId: string) => {
        setMetricsLoading(true);
        try {
            const dep = deployments.find((d) => d.id === deploymentId);
            if (!dep) return;

            if (dataSource === 'prometheus') {
                const end = Math.floor(Date.now() / 1000);
                const start = end - 3600;
                const { merged, latest: newLatest } = await fetchPromMetrics(dep, start, end);
                setHistory(merged as any);
                setLatest(newLatest);
            } else {
                const [latestMetric, historyMetrics] = await Promise.all([
                    getLatestMetric(dep.serviceEnvironmentId),
                    getMetricsHistory(dep.serviceEnvironmentId)
                ]);
                setLatest(latestMetric);
                setHistory(Array.isArray(historyMetrics) ? historyMetrics : []);
            }
        } catch {
        } finally {
            setMetricsLoading(false);
        }
    }, [deployments, dataSource, fetchPromMetrics]);

    const loadPods = useCallback(async (deploymentId: string) => {
        try {
            const data = await k8sService.getPods(deploymentId);
            if (!podsEqual(data, podsRef.current)) {
                podsRef.current = data;
                setPods(data);
            }
            setPodsLoading(false);
        } catch {
            setPods([]);
            setPodsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDeploymentId) {
            loadMetrics(selectedDeploymentId);
            loadPods(selectedDeploymentId);
        }
    }, [selectedDeploymentId, loadMetrics, loadPods]);

    const pollPodsRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (pollingEnabled && selectedDeploymentId && selectedDeployment) {
            pollRef.current = setInterval(async () => {
                const dep = selectedDeployment;
                try {
                    if (dataSource === 'prometheus') {
                        const end = Math.floor(Date.now() / 1000);
                        const start = end - 120;
                        const { merged, latest: newLatest } = await fetchPromMetrics(dep, start, end);
                        if (merged.length > 0) {
                            setLatest(newLatest);
                            setHistory((prev) => {
                                const updated = [...prev, ...merged];
                                return updated.length > 120 ? updated.slice(-120) : updated;
                            });
                        }
                    } else {
                        const [latestMetric] = await Promise.all([
                            getLatestMetric(dep.serviceEnvironmentId),
                        ]);
                        setLatest(latestMetric);
                    }
                } catch {
                }
            }, 20_000);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [pollingEnabled, selectedDeploymentId, selectedDeployment, dataSource, fetchPromMetrics]);

    useEffect(() => {
        if (pollPodsRef.current) clearInterval(pollPodsRef.current);
        if (pollingEnabled && selectedDeploymentId) {
            pollPodsRef.current = setInterval(async () => {
                try {
                    const podData = await k8sService.getPods(selectedDeploymentId);
                    if (!podsEqual(podData, podsRef.current)) {
                        podsRef.current = podData;
                        setPods(podData);
                    }
                } catch {
                }
            }, 30_000);
        }
        return () => { if (pollPodsRef.current) clearInterval(pollPodsRef.current); };
    }, [pollingEnabled, selectedDeploymentId]);

    const chartData = useMemo(() => {
        let next: any[];
        if (dataSource === 'prometheus') {
            next = history as any;
        } else {
            const sorted = [...history].sort(
                (a: any, b: any) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
            );
            next = sorted.map((m: any) => ({
                time: new Date(m.createdAt ?? '').toLocaleTimeString(),
                cpu: m.cpuUsage ?? 0,
                ram: m.ramUsage ?? 0
            }));
        }
        if (chartDataEqual(next, chartDataRef.current)) {
            return chartDataRef.current;
        }
        chartDataRef.current = next;
        return next;
    }, [history, dataSource]);

    const runningPods = useMemo(() => pods.filter((p) => p.status === 'Running').length, [pods]);

    const handleRefresh = useCallback(() => {
        if (selectedDeploymentId) {
            loadMetrics(selectedDeploymentId);
            loadPods(selectedDeploymentId);
        }
    }, [selectedDeploymentId, loadMetrics, loadPods]);

    const handleRestart = useCallback(async (d: K8sDeployment) => {
        try {
            await k8sService.restart(d.id);
            toast.success(`Restarted "${d.name}"`);
            await loadPods(d.id);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to restart deployment'));
        }
    }, [loadPods]);

    const handleScale = useCallback(async () => {
        if (!scaleTarget) return;
        if (scaleReplicas < 0 || scaleReplicas > MAX_REPLICAS) return toast.error(`Replicas must be 0-${MAX_REPLICAS}`);
        try {
            await k8sService.scale(scaleTarget.id, scaleReplicas);
            toast.success(`Scaled "${scaleTarget.name}" to ${scaleReplicas} replicas`);
            setScaleTarget(null);
            await loadPods(scaleTarget.id);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to scale deployment'));
        }
    }, [scaleTarget, scaleReplicas, loadPods]);

    const handleViewLogs = useCallback(async (d: K8sDeployment) => {
        setLogsTarget(d);
        setLogsLoading(true);
        setLogsData('');
        try {
            const data = await k8sService.getLogs(d.id);
            setLogsData(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load logs'));
        } finally {
            setLogsLoading(false);
        }
    }, []);

    const handleViewEvents = useCallback(async (d: K8sDeployment) => {
        setEventsTarget(d);
        setEventsLoading(true);
        setEventsData('');
        try {
            const data = await k8sService.getEvents(d.id);
            setEventsData(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load events'));
        } finally {
            setEventsLoading(false);
        }
    }, []);

    const handleDelete = useCallback(async (d: K8sDeployment) => {
        try {
            await k8sService.remove(d.id);
            toast.success('Deployment deleted');
            setDeployments((prev) => prev.filter((p) => p.id !== d.id));
            if (selectedDeploymentId === d.id) setSelectedDeploymentId(deployments.filter((p) => p.id !== d.id)[0]?.id ?? '');
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete deployment'));
        }
    }, [selectedDeploymentId, deployments]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{t('monitoring.title')}</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14 }}>{t('monitoring.subtitle')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {dataSource === 'prometheus' && (
                        <Chip size="small" icon={<TimelineIcon sx={{ fontSize: 12 }} />} label={t('monitoring.prometheus')}
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, backgroundColor: '#E4EEF7', color: '#2E5C8A' }} />
                    )}
                    {pollingEnabled && selectedDeploymentId && (
                        <Chip size="small"
                            icon={<AutorenewIcon sx={{ fontSize: 12, animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />}
                            label={t('monitoring.autoRefresh')}
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, backgroundColor: '#E0F1E6', color: '#2E7A4F', '& .MuiChip-icon': { ml: 0.5 } }} />
                    )}
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
                            <IconButton onClick={handleRefresh} disabled={metricsLoading}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}>
                                {metricsLoading ? <LoadingSpinner size={18} variant="inline" /> : <RefreshIcon sx={{ fontSize: 18, color: C.muted }} />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr 0.8fr 0.8fr 0.8fr' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>{t('monitoring.deployment')}</Typography>
                        {deployLoading ? <Skeleton width="80%" /> : (
                            <FormControl fullWidth size="small">
                                <Select value={selectedDeploymentId} onChange={(e) => setSelectedDeploymentId(e.target.value)} displayEmpty
                                    sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border } }}>
                                    <MenuItem value="" disabled>{t('monitoring.selectDeployment')}</MenuItem>
                                    {deployments.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: '1px solid #E0E7FF', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('monitoring.cpu')}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#4338CA', mt: 0.5 }}>{formatPct(latest?.cpuUsage)}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: '1px solid #D1FAE5', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', boxShadow: '0 2px 8px rgba(16,185,129,0.08)' }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('monitoring.ram')}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#047857', mt: 0.5 }}>{formatPct(latest?.ramUsage)}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: '1px solid #FEF3C7', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', boxShadow: '0 2px 8px rgba(245,158,11,0.08)' }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('monitoring.pods')}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#B45309', mt: 0.5 }}>{runningPods}/{pods.length}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('monitoring.dataSource')}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#374151', mt: 0.5 }}>
                            {dataSource === 'prometheus' ? t('monitoring.prometheus') : dataSource === 'checking' ? '...' : t('monitoring.database')}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: '0 4px 16px rgba(99,102,241,0.06)', overflow: 'visible' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#6366F1' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, fontSize: 15 }}>
                                {t('monitoring.cpuUsage')}
                            </Typography>
                            <Typography sx={{ ml: 'auto', fontSize: 11, color: '#9CA3AF' }}>
                                {chartData.length > 0 && t('monitoring.pts', { count: chartData.length })}
                            </Typography>
                        </Box>
                        {metricsLoading && chartData.length === 0 ? (
                            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
                        ) : chartData.length === 0 ? (
                            <Typography sx={{ color: C.muted, textAlign: 'center', py: 6 }}>
                                {selectedDeploymentId ? t('monitoring.noMetrics') : t('monitoring.selectDeploymentHint')}
                            </Typography>
                        ) : (
                            <CpuChart data={chartData} />
                        )}
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: '0 4px 16px rgba(16,185,129,0.06)', overflow: 'visible' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#10B981' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, fontSize: 15 }}>
                                {t('monitoring.ramUsage')}
                            </Typography>
                            <Typography sx={{ ml: 'auto', fontSize: 11, color: '#9CA3AF' }}>
                                {chartData.length > 0 && t('monitoring.pts', { count: chartData.length })}
                            </Typography>
                        </Box>
                        {metricsLoading && chartData.length === 0 ? (
                            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
                        ) : chartData.length === 0 ? (
                            <Typography sx={{ color: C.muted, textAlign: 'center', py: 6 }}>
                                {selectedDeploymentId ? t('monitoring.noMetrics') : t('monitoring.selectDeploymentHint')}
                            </Typography>
                        ) : (
                            <RamChart data={chartData} />
                        )}
                    </CardContent>
                </Card>
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {t('monitoring.podsSection', { name: selectedDeployment?.name || '' })}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 13 }}>
                            {t('monitoring.podCount', { count: pods.length })}
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, borderColor: C.border }} />
                    {podsLoading ? (
                        <LoadingSpinner variant="block" />
                    ) : pods.length === 0 ? (
                        <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>
                            {selectedDeploymentId ? t('monitoring.noPods') : t('monitoring.selectDeploymentHint')}
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('common.name')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('monitoring.ready')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('monitoring.restarts')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('monitoring.age')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="center">{t('common.actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pods.map((pod) => {
                                        const pc = POD_STATUS_COLORS[pod.status] ?? { bg: '#F3F4F6', fg: '#374151' };
                                        return (
                                            <TableRow key={pod.name + '-' + pod.namespace}>
                                                <TableCell>
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{pod.name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={pod.status} size="small"
                                                        sx={{ backgroundColor: pc.bg, color: pc.fg, fontWeight: 700, fontSize: 10 }} />
                                                </TableCell>
                                                <TableCell>{pod.ready}</TableCell>
                                                <TableCell>{pod.restarts}</TableCell>
                                                <TableCell>{pod.age}</TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                                                        {selectedDeployment && (
                                                            <>
                                                                <Tooltip title={t('k8s.scale')}>
                                                                    <IconButton size="small" onClick={() => { setScaleReplicas(selectedDeployment.replicas); setScaleTarget(selectedDeployment); }}
                                                                        sx={{ color: '#2E5C8A' }}><ScaleIcon sx={{ fontSize: 15 }} /></IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={t('k8s.restart')}>
                                                                    <IconButton size="small" onClick={() => handleRestart(selectedDeployment)}
                                                                        sx={{ color: '#9333EA' }}><RestartAltIcon sx={{ fontSize: 15 }} /></IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={t('k8s.logs')}>
                                                                    <IconButton size="small" onClick={() => handleViewLogs(selectedDeployment)}
                                                                        sx={{ color: '#8A6A2E' }}><TerminalIcon sx={{ fontSize: 15 }} /></IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={t('k8s.events')}>
                                                                    <IconButton size="small" onClick={() => handleViewEvents(selectedDeployment)}
                                                                        sx={{ color: '#6366F1' }}><EventsIcon sx={{ fontSize: 15 }} /></IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={t('common.delete')}>
                                                                    <IconButton size="small" onClick={() => handleDelete(selectedDeployment)}
                                                                        sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!scaleTarget} onClose={() => setScaleTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('k8s.scaleDialogTitle', { name: scaleTarget?.name })}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth type="number" label={t('k8s.replicas')} value={scaleReplicas}
                        onChange={(e) => setScaleReplicas(Number(e.target.value))}
                        slotProps={{ htmlInput: { min: 0, max: MAX_REPLICAS } }}
                        helperText={t('k8s.maxReplicas', { max: MAX_REPLICAS })} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setScaleTarget(null)}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={handleScale} sx={{ fontWeight: 700 }}>{t('k8s.scale')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!logsTarget} onClose={() => setLogsTarget(null)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('k8s.logsDialogTitle', { name: logsTarget?.name })}</span>
                    <IconButton size="small" onClick={() => setLogsTarget(null)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {logsLoading ? (
                        <LoadingSpinner variant="block" />
                    ) : !logsData ? (
                        <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>{t('k8s.noLogs')}</Typography>
                    ) : (
                        <Box sx={{ backgroundColor: '#1E293B', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                            <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                                {logsData}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={() => setLogsTarget(null)}>{t('common.close')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!eventsTarget} onClose={() => setEventsTarget(null)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('k8s.eventsDialogTitle', { name: eventsTarget?.name })}</span>
                    <IconButton size="small" onClick={() => setEventsTarget(null)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {eventsLoading ? (
                        <LoadingSpinner variant="block" />
                    ) : !eventsData ? (
                        <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>{t('k8s.noEvents')}</Typography>
                    ) : (
                        <Box sx={{ backgroundColor: '#1E293B', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                            <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                                {eventsData}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={() => setEventsTarget(null)}>{t('common.close')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MonitoringTempsReelPage;