import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import TerminalIcon from '@mui/icons-material/Terminal';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StopIcon from '@mui/icons-material/Stop';
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {
    AppBar,
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Slide,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    TextField,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis
} from 'recharts';

import api from '../../../services/axiosInstance';
import { getErrorMessage } from '../../../utils/errorMessage';
import { vmService } from '../../../services/VmService';
import type { Vm, VmStatus, VmMetrics } from '../../../services/interfaces/vm';
import CreateVmDialog from './CreateVmDialog';
import SshTerminal from './SshTerminal';
import { C } from '../../../theme/tokens';
import { getStoredUser } from '../../../services/authStorage';
import { canManageVMs } from '../../../services/authorization';

const STATUS_META: Record<VmStatus, { labelKey: string; color: string; bg: string; icon: React.ReactNode }> = {
    RUNNING: { labelKey: 'vms.running', color: '#065F46', bg: '#D1FAE5', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    STOPPED: { labelKey: 'vms.stopped', color: '#6B7280', bg: '#F3F4F6', icon: <PauseCircleIcon sx={{ fontSize: 14 }} /> },
    FAILED: { labelKey: 'vms.failed', color: '#991B1B', bg: '#FEE2E2', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
    PENDING: { labelKey: 'vms.pending', color: '#92400E', bg: '#FEF3C7', icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} /> },
    TERMINATED: { labelKey: 'vms.terminated', color: '#6B7280', bg: '#F3F4F6', icon: <CancelIcon sx={{ fontSize: 14 }} /> }
};

const formatBps = (bps: number): string => {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
};

const POLL_INTERVAL_MS = 4000;
const METRICS_POLL_INTERVAL_MS = 2000;

const usageColor = (value: number): 'success' | 'warning' | 'error' => {
    if (value >= 85) return 'error';
    if (value >= 60) return 'warning';
    return 'success';
};

const COLOR_HEX: Record<'success' | 'warning' | 'error', string> = {
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f'
};

const formatTimestamp = (timestamp: string, short = false) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return short ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString();
};

const Transition = forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const chartDataEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].cpuUsage !== b[i].cpuUsage || a[i].ramUsage !== b[i].ramUsage || a[i].diskUsage !== b[i].diskUsage || a[i].networkUsage !== b[i].networkUsage) {
            return false;
        }
    }
    return true;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(228,71,125,0.15)',
            borderRadius: 2.5,
            px: 1.5,
            py: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', mb: 0.5 }}>{label}</Typography>
            {payload.map((entry: any) => (
                <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, my: 0.25 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                    <Typography sx={{ fontSize: 12, color: '#374151' }}>{entry.name}: <b>{Number(entry.value).toFixed(1)}%</b></Typography>
                </Box>
            ))}
        </Box>
    );
};

const GaugeCard = memo(({ item, latestMetric }: { item: { labelKey: string; value: number; unit: string | null; icon: React.ReactNode }; latestMetric: VmMetrics }) => {
    const { t } = useTranslation();
    const isNetwork = item.labelKey === 'vms.network';
    const value = item.value;
    const pct = Math.min(value, 100);
    const gradientId = `gauge-${item.labelKey.replace(/^vms\./, '')}`;
    const colors: Record<string, string> = {
        'vms.cpu': '#6366F1',
        'vms.ram': '#8B5CF6',
        'vms.disk': '#F59E0B',
        'vms.network': '#10B981'
    };
    const color = colors[item.labelKey] || '#6366F1';
    const lightColor = color + '18';
    const barColor = pct >= 85 ? '#EF4444' : pct >= 60 ? '#F59E0B' : color;

    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 3,
            border: '1px solid',
            borderColor: lightColor,
            background: `linear-gradient(135deg, ${lightColor} 0%, #FFFFFF 100%)`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 24px ${lightColor}` }
        }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                <Box sx={{ color, display: 'flex' }}>{item.icon}</Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {t(item.labelKey)}
                </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1F2937', lineHeight: 1.1, mb: 0.5 }}>
                {isNetwork ? formatBps(value) : value.toFixed(1)}
                {item.unit && <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', ml: 0.5 }}>{item.unit}</Typography>}
            </Typography>
            {!isNetwork && (
                <Box sx={{ mt: 1.5, position: 'relative' }}>
                    <LinearProgress variant="determinate" value={pct} sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: lightColor,
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: barColor,
                            borderRadius: 3,
                            transition: 'transform 0.5s ease'
                        }
                    }} />
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', mt: 0.5, textAlign: 'right' }}>
                        {pct.toFixed(0)}%
                    </Typography>
                </Box>
            )}
        </Paper>
    );
});

const METRIC_LINES: { key: 'cpuUsage' | 'ramUsage' | 'diskUsage'; labelKey: string; color: string; gradId: string }[] = [
    { key: 'cpuUsage', labelKey: 'vms.cpu', color: '#6366F1', gradId: 'cpuGrad' },
    { key: 'ramUsage', labelKey: 'vms.ram', color: '#8B5CF6', gradId: 'ramGrad' },
    { key: 'diskUsage', labelKey: 'vms.disk', color: '#F59E0B', gradId: 'diskGrad' }
];

const VmsPage = () => {
    const { t } = useTranslation();
    const [vms, setVms] = useState<Vm[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Vm | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [metricsTarget, setMetricsTarget] = useState<Vm | null>(null);
    const [metrics, setMetrics] = useState<VmMetrics[] | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [liveMonitoring, setLiveMonitoring] = useState(false);
    const [tab, setTab] = useState<'overview' | 'history'>('overview');
    const [historyPage, setHistoryPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const metricsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [sshTarget, setSshTarget] = useState<Vm | null>(null);
    const [sshInfo, setSshInfo] = useState<{ host: string; port: number; user: string; privateKeyPath: string } | null>(null);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const [sshInfoOpen, setSshInfoOpen] = useState(false);
    const [downloadingKey, setDownloadingKey] = useState(false);
    const currentUser = getStoredUser();
    const allowManage = currentUser ? canManageVMs(currentUser) : false;

    const loadVms = useCallback(async (showSpinner = false) => {
        if (showSpinner) setLoading(true);
        try {
            const result = await vmService.getAllPaginated(page, PAGE_SIZE);
            setVms(result.items);
            setTotalElements(result.total);
        } catch (err) {
            setSnackbar({ message: getErrorMessage(err, 'Failed to load VMs'), severity: 'error' });
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [page]);

    useEffect(() => { loadVms(true); }, [loadVms]);

    useEffect(() => { if (page >= vmPageCount && page > 0) setPage(vmPageCount - 1); }, [totalElements]);

    useEffect(() => {
        const hasPending = vms.some((vm) => vm.status === 'PENDING');
        if (hasPending && !pollRef.current) {
            pollRef.current = setInterval(() => loadVms(false), POLL_INTERVAL_MS);
        }
        if (!hasPending && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [vms, loadVms]);

    const periodicRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        periodicRefreshRef.current = setInterval(() => loadVms(false), 30000);
        return () => {
            if (periodicRefreshRef.current) {
                clearInterval(periodicRefreshRef.current);
                periodicRefreshRef.current = null;
            }
        };
    }, [loadVms]);

    const runAction = async (id: string, action: () => Promise<Vm>, successMessage: string) => {
        setActionLoadingId(id);
        try {
            await action();
            setSnackbar({ message: successMessage, severity: 'success' });
            await loadVms(false);
        } catch (err) {
            setSnackbar({ message: getErrorMessage(err, 'Action failed'), severity: 'error' });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleStart = (vm: Vm) => runAction(vm.id, () => vmService.start(vm.id), `${vm.name} started`);
    const handleStop = (vm: Vm) => runAction(vm.id, () => vmService.stop(vm.id), `${vm.name} stopped`);
    const handleRestart = (vm: Vm) => runAction(vm.id, () => vmService.restart(vm.id), `${vm.name} restarted`);

    const handleDelete = async (vm: Vm) => {
        setDeleteTarget(vm);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const vm = deleteTarget;
        setDeleteTarget(null);
        setActionLoadingId(vm.id);
        try {
            await vmService.remove(vm.id);
            setSnackbar({ message: t('vms.deletedSuccess', { name: vm.name }), severity: 'success' });
            await loadVms(false);
        } catch (err) {
            setSnackbar({ message: getErrorMessage(err, t('vms.deleteFailed')), severity: 'error' });
        } finally {
            setActionLoadingId(null);
        }
    };

    const fetchMetrics = useCallback(async (vmId: string, silent = false) => {
        if (!silent) setMetricsLoading(true);
        try {
            const data = await vmService.getMetrics(vmId);
            setMetrics(data);
            setMetricsError(null);
        } catch (err) {
            setMetricsError(getErrorMessage(err, 'Failed to load metrics'));
        } finally {
            if (!silent) setMetricsLoading(false);
        }
    }, []);

    const handleViewMetrics = async (vm: Vm) => {
        setMetricsTarget(vm);
        setMetrics(null);
        setMetricsError(null);
        setTab('overview');
        await fetchMetrics(vm.id);
    };

    const handleDownloadKey = async (vmId: string) => {
        if (downloadingKey) return;
        setDownloadingKey(true);
        try {
            const { data } = await api.get<string>(`/vms/${vmId}/ssh/key`);
            const blob = new Blob([data], { type: 'application/x-pem-file' });
            const filename = `ssh-key-${vmId.slice(0, 8)}.pem`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            let msg = t('vms.downloadKeyFailed');
            if (e?.response?.data instanceof Blob) {
                try {
                    const text = await e.response.data.text();
                    const parsed = JSON.parse(text);
                    msg = parsed.message || parsed.error || msg;
                } catch { /* ignore parse errors */ }
            } else if (e?.response?.status === 404) {
                msg = t('vms.keyNotFound');
            } else if (e?.response?.status === 401 || e?.response?.status === 403) {
                msg = t('vms.keyUnauthorized');
            }
            setSnackbar({ message: msg, severity: 'error' });
        } finally {
            setDownloadingKey(false);
        }
    };

    useEffect(() => { setHistoryPage(1); }, [tab]);

    const closeMetrics = () => {
        setMetricsTarget(null);
        setMetrics(null);
        setMetricsError(null);
        setLiveMonitoring(false);
    };

    const handleOpenSsh = async (vm: Vm) => {
        setSshTarget(vm);
        setSshInfo(null);
        try {
            const info = await vmService.sshInfo(vm.id);
            setSshInfo(info);
        } catch {
        }
    };

    useEffect(() => {
        if (liveMonitoring && metricsTarget) {
            metricsPollRef.current = setInterval(() => fetchMetrics(metricsTarget.id, true), METRICS_POLL_INTERVAL_MS);
        }
        return () => {
            if (metricsPollRef.current) {
                clearInterval(metricsPollRef.current);
                metricsPollRef.current = null;
            }
        };
    }, [liveMonitoring, metricsTarget, fetchMetrics]);

    const chartData = useMemo(() => {
        if (!metrics) return [];
        const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
        const toTime = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
        return [...metrics]
            .filter((m) => {
                const t = new Date(m.timestamp || '').getTime();
                if (fromTime !== null && t < fromTime) return false;
                if (toTime !== null && t > toTime) return false;
                return true;
            })
            .sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime())
            .map((m) => ({ ...m, timeLabel: formatTimestamp(m.timestamp || '', true) }));
    }, [metrics, dateFrom, dateTo]);

    const sortedMetrics = useMemo(() => [...chartData].reverse(), [chartData]);
    const latestMetric = sortedMetrics[0];
    const historyRows = 15;
    const historyPageCount = Math.max(1, Math.ceil(sortedMetrics.length / historyRows));
    const paginatedMetrics = useMemo(() => sortedMetrics.slice((historyPage - 1) * historyRows, historyPage * historyRows), [sortedMetrics, historyPage]);

    const gaugeItems = latestMetric
        ? [
              { labelKey: 'vms.cpu', value: latestMetric.cpuUsage, unit: '%', icon: <SpeedIcon fontSize="small" /> },
              { labelKey: 'vms.ram', value: latestMetric.ramUsage, unit: '%', icon: <MemoryIcon fontSize="small" /> },
              { labelKey: 'vms.network', value: latestMetric.networkUsage, unit: null, icon: <NetworkCheckIcon fontSize="small" /> },
              { labelKey: 'vms.disk', value: latestMetric.diskUsage, unit: '%', icon: <StorageIcon fontSize="small" /> }
          ]
        : [];

    const vmPageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const kpis = useMemo(() => ({
        total: totalElements,
        running: vms.filter((v) => v.status === 'RUNNING').length,
        stopped: vms.filter((v) => v.status === 'STOPPED').length,
        failed: vms.filter((v) => v.status === 'FAILED').length,
    }), [vms]);

    const kpiCards = [
        { label: t('vms.total'), value: kpis.total, bg: '#F5F3FF', color: '#5B21B6' },
        { label: t('vms.running'), value: kpis.running, bg: '#D1FAE5', color: '#065F46' },
        { label: t('vms.stopped'), value: kpis.stopped, bg: '#F3F4F6', color: '#6B7280' },
        { label: t('vms.failed'), value: kpis.failed, bg: '#FEE2E2', color: '#991B1B' },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                        {t('vms.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14, mt: 0.5 }}>
                        {t('vms.subtitle')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton onClick={() => loadVms(true)}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}>
                                <RefreshIcon sx={{ fontSize: 18, color: C.muted }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {allowManage && (
                    <Button variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                        sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, borderRadius: 2, fontWeight: 700 }}>
                        {t('vms.createVm')}
                    </Button>
                    )}
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                {kpiCards.map((kpi) => (
                    <Paper key={kpi.label} elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: kpi.bg, border: '1px solid transparent' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: kpi.color, textTransform: 'uppercase', mb: 0.5 }}>{kpi.label}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {[t('common.name'), t('common.status'), t('vms.cpu'), t('vms.ram'), t('vms.disk'), t('vms.ip'), t('common.actions')].map((h) => (
                                    <TableCell key={h} sx={{ fontWeight: 700, color: C.subtle, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <LoadingSpinner size={28} variant="block" />
                                    </TableCell>
                                </TableRow>
                            ) : vms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <DnsIcon sx={{ fontSize: 40, color: C.subtle, mb: 1 }} />
                                        <Typography color="text.secondary">{t('vms.noVms')}</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                vms.map((vm) => {
                                    const isBusy = actionLoadingId === vm.id;
                                    const meta = STATUS_META[vm.status];
                                    const canStart = vm.status === 'STOPPED' || vm.status === 'FAILED' || vm.status === 'PENDING';
                                    const canStop = vm.status === 'RUNNING';
                                    const canRestart = vm.status === 'RUNNING';

                                    return (
                                        <TableRow key={vm.id} hover sx={{ '&:hover': { backgroundColor: '#FAF8FF' }, transition: 'background 0.15s' }}>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                                                    {vm.displayName || vm.name}
                                                </Typography>
                                                {vm.displayName && (
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: C.subtle, mt: 0.25 }}>
                                                        {vm.name}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" icon={meta.icon as React.ReactElement} label={t(meta.labelKey)}
                                                    sx={{ backgroundColor: meta.bg, color: meta.color, fontWeight: 700, fontSize: 11, height: 24 }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: C.text }}>{vm.cpu}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: C.text }}>{vm.ram}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: C.text }}>{vm.disk}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: vm.ipAddress ? C.text : C.subtle }}>
                                                    {vm.ipAddress ?? '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {isBusy ? (
                                                    <LoadingSpinner size={18} variant="inline" />
                                                ) : (
                                                    <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                        <Tooltip title={t('vms.ssh')}>
                                                            <span>
                                                                <IconButton size="small" disabled={vm.status !== 'RUNNING'} onClick={() => handleOpenSsh(vm)}
                                                                    sx={{ color: '#6366F1' }}><TerminalIcon sx={{ fontSize: 16 }} /></IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('vms.metrics')}>
                                                            <span>
                                                                <IconButton size="small" disabled={vm.status !== 'RUNNING'} onClick={() => handleViewMetrics(vm)}
                                                                    sx={{ color: '#2E5C8A' }}><MonitorHeartIcon sx={{ fontSize: 16 }} /></IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('vms.start')}>
                                                            <span>
                                                                <IconButton size="small" disabled={!canStart} onClick={() => handleStart(vm)}
                                                                    sx={{ color: '#065F46' }}><PlayArrowIcon sx={{ fontSize: 16 }} /></IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('vms.stop')}>
                                                            <span>
                                                                <IconButton size="small" disabled={!canStop} onClick={() => handleStop(vm)}
                                                                    sx={{ color: '#92400E' }}><StopIcon sx={{ fontSize: 16 }} /></IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('vms.restart')}>
                                                            <span>
                                                                <IconButton size="small" disabled={!canRestart} onClick={() => handleRestart(vm)}
                                                                    sx={{ color: '#9333EA' }}><RestartAltIcon sx={{ fontSize: 16 }} /></IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        {allowManage && (
                                                        <Tooltip title={t('common.delete')}>
                                                            <IconButton size="small" onClick={() => handleDelete(vm)}
                                                                sx={{ color: '#DC2626' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                                        </Tooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <PaginationBar page={page + 1} pageCount={vmPageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />

            <Dialog fullScreen open={!!sshTarget} onClose={() => setSshTarget(null)}
                slots={{ transition: Transition }}
                slotProps={{ paper: { sx: { display: 'flex', flexDirection: 'column', height: '100%' } } }}>
                <AppBar position="relative" color="default" elevation={1}>
                    <Toolbar>
                        <TerminalIcon sx={{ mr: 1.5 }} color="action" />
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('vms.sshDialogTitle', { name: sshTarget?.name })}</Typography>
                        {sshInfo && (
                            <Tooltip title={t('vms.sshConnectionInfo')}>
                                <IconButton onClick={() => setSshInfoOpen(!sshInfoOpen)}><InfoOutlinedIcon /></IconButton>
                            </Tooltip>
                        )}
                        {sshTarget && (
                            <Tooltip title={t('vms.downloadPrivateKey')}>
                                <span>
                                    <IconButton onClick={() => handleDownloadKey(sshTarget.id)} disabled={downloadingKey}><DownloadIcon /></IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <IconButton edge="end" onClick={() => setSshTarget(null)}><CloseIcon /></IconButton>
                    </Toolbar>
                </AppBar>
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#1a1a2e' }}>
                    {sshInfoOpen && sshInfo && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 1, borderRadius: 2, border: '1px solid #333', backgroundColor: '#16213e', flexShrink: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.brand, mb: 1 }}>{t('vms.sshConnectionInfo')}</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: '#aaa' }}>{t('vms.host')}: {sshInfo.host}</Typography>
                                <Typography variant="body2" sx={{ color: '#aaa' }}>{t('vms.port')}: {sshInfo.port}</Typography>
                                <Typography variant="body2" sx={{ color: '#aaa' }}>{t('vms.user')}: {sshInfo.user}</Typography>
                            </Box>
                        </Paper>
                    )}
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        {sshTarget && <SshTerminal key={sshTarget.id} vmId={sshTarget.id} vmName={sshTarget.name} sshInfo={sshInfo} />}
                    </Box>
                </Box>
            </Dialog>

            <CreateVmDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => loadVms(false)} />

            <Dialog fullScreen open={!!metricsTarget} onClose={closeMetrics} slots={{ transition: Transition }}>
                <AppBar position="relative" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: '#F0E6F0' }}>
                    <Toolbar>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                            <MonitorHeartIcon sx={{ color: C.brand }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                {t('vms.metricsDialogTitle', { name: metricsTarget?.name })}
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FormControlLabel
                                control={
                                    <Switch checked={liveMonitoring} onChange={(e) => setLiveMonitoring(e.target.checked)}
                                        sx={{ '& .MuiSwitch-thumb': { backgroundColor: liveMonitoring ? C.brand : '#CBD5E1' } }} />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <FiberManualRecordIcon sx={{ fontSize: 10, color: liveMonitoring ? '#EF4444' : '#CBD5E1' }} />
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t('vms.live')}</Typography>
                                    </Box>
                                }
                                sx={{ mr: 0 }}
                            />
                            <Tooltip title={t('vms.refreshNow')}>
                                <IconButton onClick={() => metricsTarget && fetchMetrics(metricsTarget.id)} disabled={metricsLoading}
                                    sx={{ border: '1px solid', borderColor: C.border, borderRadius: 2 }}>
                                    <RefreshIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <IconButton edge="end" onClick={closeMetrics}
                                sx={{ border: '1px solid', borderColor: C.border, borderRadius: 2 }}>
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    </Toolbar>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: 13 } }}>
                        <Tab value="overview" label={t('vms.overview')} />
                        <Tab value="history" label={t('vms.history', { count: sortedMetrics.length })} />
                    </Tabs>
                    </AppBar>
                    <Box sx={{
                        p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto', width: '100%',
                        background: 'linear-gradient(180deg, #FAFAFF 0%, #F5F0FA 100%)', minHeight: '100%',
                        position: 'relative', overflow: 'hidden'
                    }}>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {dateFrom !== '' || dateTo !== '' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                <TextField size="small" type="date" label={t('common.from')} value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    slotProps={{ input: { sx: { borderRadius: 2, backgroundColor: '#fff' } } }} />
                                <TextField size="small" type="date" label={t('common.to')} value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    slotProps={{ input: { sx: { borderRadius: 2, backgroundColor: '#fff' } } }} />
                                <Button size="small" variant="outlined" onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    sx={{ borderRadius: 2, textTransform: 'none', color: C.brand, borderColor: C.brandLight }}>
                                    {t('common.clear')}
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                <Tooltip title={t('vms.filterByDate')}>
                                    <Button size="small" startIcon={<span style={{ fontSize: 14 }}>📅</span>}
                                        onClick={() => setDateFrom(new Date().toISOString().slice(0, 10))}
                                        sx={{ borderRadius: 2, textTransform: 'none', color: C.brand, borderColor: C.brandLight, border: '1px solid' }}>
                                        {t('vms.filterByDate')}
                                    </Button>
                                </Tooltip>
                            </Box>
                        )}
                        {metricsLoading && (
                        <LoadingSpinner variant="block" />
                    )}
                    {metricsError && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2, border: '1px solid #FECACA' }}>{metricsError}</Alert>
                    )}
                    {!metricsLoading && !metricsError && metrics && metrics.length === 0 && (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <MonitorHeartIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1.5 }} />
                            <Typography sx={{ color: '#9CA3AF', fontWeight: 600 }}>{t('vms.noMetrics')}</Typography>
                        </Box>
                    )}
                    {!metricsLoading && latestMetric && tab === 'overview' && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 3, height: 20, borderRadius: 2, backgroundColor: C.brand }} />
                                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: C.text }}>{t('vms.currentSnapshot')}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>
                                    {t('vms.lastUpdated', { time: formatTimestamp(latestMetric.timestamp || '') })}
                                </Typography>
                            </Box>
                            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                                {gaugeItems.map((item) => (
                                    <Grid key={item.labelKey} size={{ xs: 12, sm: 6, md: 3 }}>
                                        <GaugeCard item={item} latestMetric={latestMetric} />
                                    </Grid>
                                ))}
                            </Grid>

                            {chartData.length > 1 && (
                                <Paper elevation={0} sx={{
                                    p: 3, borderRadius: 3,
                                    border: '1px solid', borderColor: C.border,
                                    background: '#FFFFFF',
                                    boxShadow: '0 4px 20px rgba(228,71,125,0.06)'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                        <Box sx={{ width: 3, height: 18, borderRadius: 2, backgroundColor: C.brand }} />
                                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: C.text }}>{t('vms.trend')}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#9CA3AF', ml: 'auto' }}>{chartData.length} {t('vms.pts', { count: chartData.length })}</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: 320 }}>
                                        <svg width="0" height="0">
                                            <defs>
                                                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                                                    <stop offset="60%" stopColor="#6366F1" stopOpacity={0.08} />
                                                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                                                    <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.08} />
                                                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                                                    <stop offset="60%" stopColor="#F59E0B" stopOpacity={0.08} />
                                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                                                </linearGradient>
                                                <filter id="glow">
                                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                                </filter>
                                            </defs>
                                        </svg>
                                        <ResponsiveContainer>
                                            <AreaChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                                                        <stop offset="60%" stopColor="#6366F1" stopOpacity={0.08} />
                                                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                                                        <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.08} />
                                                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                                                        <stop offset="60%" stopColor="#F59E0B" stopOpacity={0.08} />
                                                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                                <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} minTickGap={40} />
                                                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={32} />
                                                <ChartTooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeDasharray: '3 3', strokeOpacity: 0.4 }} />
                                                <ReferenceLine y={0} stroke="#F3F4F6" />
                                                {METRIC_LINES.map((line) => (
                                                    <Area key={line.key} type="monotone" dataKey={line.key} name={t(line.labelKey)} stroke={line.color} strokeWidth={2.5} fill={`url(#${line.gradId})`} dot={false} activeDot={{ r: 4, fill: line.color, stroke: '#fff', strokeWidth: 2 }} />
                                                ))}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            )}
                        </>
                    )}
                    {!metricsLoading && sortedMetrics.length > 0 && tab === 'history' && (
                        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: C.border, overflow: 'hidden' }}>
                            <TableContainer>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {[t('vms.timestamp'), t('vms.cpu'), t('vms.ram'), t('vms.network'), t('vms.disk')].map((h) => (
                                                <TableCell key={h} sx={{ fontWeight: 700, color: C.subtle, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, backgroundColor: '#FAFAFF' }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedMetrics.map((metric, idx) => (
                                            <TableRow key={metric.timestamp || idx} hover
                                                sx={{ '&:hover': { backgroundColor: '#FAF8FF' }, transition: 'background 0.15s' }}>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: 12, color: C.text, fontFamily: 'monospace' }}>{formatTimestamp(metric.timestamp || '')}</Typography>
                                                </TableCell>
                                                {(['cpuUsage', 'ramUsage'] as const).map((key) => (
                                                    <TableCell align="right" key={key}>
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: 1.5, backgroundColor: usageColor(metric[key]) === 'error' ? '#FEF2F2' : usageColor(metric[key]) === 'warning' ? '#FFFBEB' : '#F0FDF4' }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLOR_HEX[usageColor(metric[key])] }} />
                                                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLOR_HEX[usageColor(metric[key])] }}>{metric[key].toFixed(1)}%</Typography>
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                                <TableCell align="right">
                                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#10B981', fontFamily: 'monospace' }}>{formatBps(metric.networkUsage)}</Typography>
                                                </TableCell>
                                                {(['diskUsage'] as const).map((key) => (
                                                    <TableCell align="right" key={key}>
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: 1.5, backgroundColor: usageColor(metric[key]) === 'error' ? '#FEF2F2' : usageColor(metric[key]) === 'warning' ? '#FFFBEB' : '#F0FDF4' }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLOR_HEX[usageColor(metric[key])] }} />
                                                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLOR_HEX[usageColor(metric[key])] }}>{metric[key].toFixed(1)}%</Typography>
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                    {tab === 'history' && sortedMetrics.length > 0 && (
                        <PaginationBar page={historyPage} pageCount={historyPageCount} total={sortedMetrics.length} onPageChange={setHistoryPage} />
                    )}
                    </Box>
                    </Box>
            </Dialog>

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('vms.confirmDeleteTitle')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {deleteTarget ? t('vms.confirmDeleteBody', { name: deleteTarget.displayName || deleteTarget.name }) : ''}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteTarget(null)} variant="outlined" sx={{ borderRadius: 2, textTransform: 'capitalize', fontWeight: 700 }}>{t('common.cancel')}</Button>
                    <Button onClick={confirmDelete} variant="contained" sx={{ color: '#fff', background: '#DC2626', borderRadius: 2, textTransform: 'capitalize', fontWeight: 700, '&:hover': { background: '#B91C1C' } }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
};

export default VmsPage;