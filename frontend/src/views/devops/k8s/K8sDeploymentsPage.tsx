import {
    Add as AddIcon,
    Autorenew as AutorenewIcon,
    Close as CloseIcon,
    PlayArrow as PlayArrowIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Fade,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { getStoredUser } from '../../../services/authStorage';
import { canManageK8s } from '../../../services/authorization';
import {
    listEnvironments,
    listServiceEnvironments,
    listServices,
    type EnvironmentResponse,
    type ServiceEnvironmentResponse,
    type ServiceResponse
} from '../../../services/devopsService';
import type { K8sDeployment, K8sHpaResponse, K8sPod } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import PaginationBar from '../../../components/PaginationBar';
import { C, POLL_INTERVAL_MS, MAX_REPLICAS, STATUS_FILTERS } from './constants';
import CreateK8sForm from './CreateK8sForm';
import K8sCard from './K8sCard';
import K8sDialogs from './K8sDialogs';

const DeploymentSkeleton = () => (
    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}` }}>
        <CardContent>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="90%" sx={{ mt: 1 }} />
            <Skeleton variant="text" width="80%" />
        </CardContent>
    </Card>
);

const KpiCard = ({ label, value, bg, color }: { label: string; value: number; bg: string; color: string }) => (
    <Card sx={{ borderRadius: 3, border: `1px solid ${color}22`, backgroundColor: bg, boxShadow: '0 2px 8px rgba(228,71,125,0.06)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                    <Typography sx={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{String(value).charAt(0)}</Typography>
                </Box>
                <Box>
                    <Typography sx={{ color, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</Typography>
                    <Typography sx={{ color, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{value}</Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const K8sDeploymentsPage = () => {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [deployments, setDeployments] = useState<K8sDeployment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hpaConfigs, setHpaConfigs] = useState<Record<string, K8sHpaResponse>>({});

    const [scaleTarget, setScaleTarget] = useState<K8sDeployment | null>(null);
    const [scaleReplicas, setScaleReplicas] = useState(1);

    const [deleteTarget, setDeleteTarget] = useState<K8sDeployment | null>(null);

    const [podsTarget, setPodsTarget] = useState<K8sDeployment | null>(null);
    const [pods, setPods] = useState<K8sPod[]>([]);
    const [podsLoading, setPodsLoading] = useState(false);
    const [podsTab, setPodsTab] = useState(0);

    const [logsTarget, setLogsTarget] = useState<K8sDeployment | null>(null);
    const [logs, setLogs] = useState('');
    const [logsLoading, setLogsLoading] = useState(false);

    const [eventsTarget, setEventsTarget] = useState<K8sDeployment | null>(null);
    const [events, setEvents] = useState('');
    const [eventsLoading, setEventsLoading] = useState(false);

    const [hpaTarget, setHpaTarget] = useState<K8sDeployment | null>(null);
    const [hpaMinReplicas, setHpaMinReplicas] = useState(1);
    const [hpaMaxReplicas, setHpaMaxReplicas] = useState(10);
    const [hpaCpuTarget, setHpaCpuTarget] = useState(50);
    const [hpaMemoryTarget, setHpaMemoryTarget] = useState(80);
    const [hpaSaving, setHpaSaving] = useState(false);

    const [rollbackTarget, setRollbackTarget] = useState<K8sDeployment | null>(null);
    const [rollbackRevision, setRollbackRevision] = useState(0);
    const [rollbackSaving, setRollbackSaving] = useState(false);

    const currentUser = getStoredUser();
    const allowManage = currentUser ? canManageK8s(currentUser) : false;
    const [serviceEnvs, setServiceEnvs] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const loadHpas = async (deps: K8sDeployment[]) => {
        const results = await Promise.allSettled(deps.map((d) => k8sService.getHpa(d.id)));
        const configs: Record<string, K8sHpaResponse> = {};
        deps.forEach((d, i) => {
            if (results[i].status === 'fulfilled' && results[i].value) {
                configs[d.id] = results[i].value;
            }
        });
        setHpaConfigs(configs);
    };

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const user = getStoredUser();
            const result = await k8sService.getAllPaginated(page, PAGE_SIZE, user?.tenantId);
            setDeployments(result.items);
            setTotalElements(result.total);
            loadHpas(result.items);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load deployments'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => {
        Promise.all([listServiceEnvironments(), listServices(), listEnvironments()])
            .then(([se, svc, env]) => {
                setServiceEnvs(se);
                setServices(svc);
                setEnvironments(env);
            })
            .catch((e) => {
                toast.error(getErrorMessage(e, 'Failed to load service environments'));
            });
    }, []);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const hasPending = useMemo(
        () => deployments.some((d) => ['CREATED', 'SCALED', 'RESTARTED'].includes(d.status)),
        [deployments]
    );

    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (hasPending) {
            pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [hasPending]);

    const filtered = useMemo(() => {
        let list = deployments;
        if (statusFilter !== 'All') {
            list = list.filter((d) => d.status === statusFilter);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((d) =>
                [d.name, d.dockerImage, d.namespace, d.status, d.id, d.serviceEnvironmentId]
                    .join(' ')
                    .toLowerCase()
                    .includes(q)
            );
        }
        return list;
    }, [deployments, search, statusFilter]);

    useEffect(() => { setPage(0); }, [search, statusFilter]);

    const paginated = useMemo(() => {
        const start = page * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const kpis = useMemo(() => {
        const total = deployments.length;
        const running = deployments.filter((d) => d.status === 'RUNNING').length;
        const pending = deployments.filter((d) => ['CREATED', 'SCALED', 'RESTARTED', 'PENDING'].includes(d.status)).length;
        const failed = deployments.filter((d) => d.status === 'FAILED').length;
        return { total, running, pending, failed };
    }, [deployments]);

    const envName = (id: string) => {
        const se = serviceEnvs.find((s) => s.id === id);
        if (!se) return id.slice(0, 8);
        const svc = services.find((s) => s.id === se.serviceId)?.name ?? se.serviceId.slice(0, 8);
        const env = environments.find((e) => e.id === se.environmentId)?.name ?? se.environmentId.slice(0, 8);
        return `${svc} / ${env}`;
    };

    const handleScale = async () => {
        if (!scaleTarget) return;
        if (scaleReplicas < 0 || scaleReplicas > MAX_REPLICAS) return toast.error(`Replicas must be 0-${MAX_REPLICAS}`);
        try {
            await k8sService.scale(scaleTarget.id, scaleReplicas);
            toast.success(`Scaled "${scaleTarget.name}" to ${scaleReplicas} replicas`);
            setScaleTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to scale deployment'));
        }
    };

    const handleRestart = async (d: K8sDeployment) => {
        try {
            await k8sService.restart(d.id);
            toast.success(`Restarted "${d.name}"`);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to restart deployment'));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.remove(deleteTarget.id);
            toast.success('Deployment deleted');
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete deployment'));
        }
    };

    const handleViewPods = async (d: K8sDeployment) => {
        setPodsTarget(d);
        setPodsTab(0);
        setPodsLoading(true);
        setPods([]);
        try {
            const data = await k8sService.getPods(d.id);
            setPods(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load pods'));
        } finally {
            setPodsLoading(false);
        }
    };

    const handleViewLogs = async (d: K8sDeployment) => {
        setLogsTarget(d);
        setLogsLoading(true);
        setLogs('');
        try {
            const data = await k8sService.getLogs(d.id);
            setLogs(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load logs'));
        } finally {
            setLogsLoading(false);
        }
    };

    const handleViewEvents = async (d: K8sDeployment) => {
        setEventsTarget(d);
        setEventsLoading(true);
        setEvents('');
        try {
            const data = await k8sService.getEvents(d.id);
            setEvents(data);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load events'));
        } finally {
            setEventsLoading(false);
        }
    };

    const handleConfigureHpa = (d: K8sDeployment) => {
        const existing = hpaConfigs[d.id];
        setHpaTarget(d);
        setHpaMinReplicas(existing?.minReplicas ?? 1);
        setHpaMaxReplicas(existing?.maxReplicas ?? 10);
        setHpaCpuTarget(existing?.cpuTargetAverageUtilization ?? 50);
        setHpaMemoryTarget(existing?.memoryTargetAverageUtilization ?? 80);
    };

    const handleHpaSave = async () => {
        if (!hpaTarget) return;
        if (hpaMinReplicas > hpaMaxReplicas) return toast.error('Min replicas must be less than or equal to max replicas');
        setHpaSaving(true);
        try {
            await k8sService.configureHpa(hpaTarget.id, {
                minReplicas: hpaMinReplicas,
                maxReplicas: hpaMaxReplicas,
                cpuTargetAverageUtilization: hpaCpuTarget,
                memoryTargetAverageUtilization: hpaMemoryTarget
            });
            toast.success(`HPA configured for "${hpaTarget.name}"`);
            setHpaTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to configure HPA'));
        } finally {
            setHpaSaving(false);
        }
    };

    const handleHpaDelete = async () => {
        if (!hpaTarget) return;
        try {
            await k8sService.removeHpa(hpaTarget.id);
            toast.success('HPA removed');
            setHpaTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to remove HPA'));
        }
    };

    const handleRollback = async () => {
        if (!rollbackTarget) return;
        setRollbackSaving(true);
        try {
            await k8sService.rollback(rollbackTarget.id, rollbackRevision > 0 ? rollbackRevision : undefined);
            toast.success(`Rolled back "${rollbackTarget.name}"`);
            setRollbackTarget(null);
            setRollbackRevision(0);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to rollback deployment'));
        } finally {
            setRollbackSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(228,71,125,0.3)' }}>
                        <PlayArrowIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                            {t('k8s.pageTitle')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>
                            {t('k8s.deploymentCount', { count: deployments.length })}
                            {hasPending && (
                                <Chip size="small" icon={<AutorenewIcon sx={{ fontSize: 12, animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />} label={t('k8s.autoRefreshing')} sx={{ ml: 1, height: 20, fontSize: 10, fontWeight: 700, backgroundColor: '#FCE7F3', color: '#BE185D', '& .MuiChip-icon': { ml: 0.5 } }} />
                            )}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}>
                                <RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {allowManage && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, borderRadius: 2, fontWeight: 700, px: 2.5, boxShadow: '0 4px 12px rgba(228,71,125,0.3)', '&:hover': { boxShadow: '0 6px 16px rgba(228,71,125,0.4)' } }}>
                        {t('k8s.createDeployment')}
                    </Button>
                    )}
                </Box>
            </Box>

            {/* KPI Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <KpiCard label={t('k8s.totalDeployments')} value={kpis.total} bg="#FCE7F3" color="#BE185D" />
                <KpiCard label={t('k8s.running')} value={kpis.running} bg="#D1FAE5" color="#065F46" />
                <KpiCard label={t('k8s.pending')} value={kpis.pending} bg="#F7ECD6" color="#8A6A2E" />
                <KpiCard label={t('k8s.failed')} value={kpis.failed} bg="#F7DEE3" color="#A23B4E" />
            </Box>

            {/* Create form */}
            {allowManage && <CreateK8sForm open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => load(true)} serviceEnvs={serviceEnvs} services={services} environments={environments} />}

            {/* Search / filter bar */}
            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ py: '14px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('k8s.searchPlaceholder')} sx={{ flex: 1, minWidth: 220 }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : null } }} />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel id="status-filter-label">{t('common.status')}</InputLabel>
                            <Select labelId="status-filter-label" value={statusFilter} label={t('common.status')} onChange={(e) => setStatusFilter(e.target.value)}>
                                {STATUS_FILTERS.map((s) => (<MenuItem key={s} value={s}>{s === 'All' ? t('common.all') : s.charAt(0) + s.slice(1).toLowerCase()}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <Chip label={`${filtered.length} / ${deployments.length}`} size="small" sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, fontSize: 12 }} />
                    </Box>
                </CardContent>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {[1, 2, 3, 4].map((i) => (<DeploymentSkeleton key={i} />))}
                </Box>
            )}

            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <PlayArrowIcon sx={{ fontSize: 48, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{search || statusFilter !== 'All' ? t('k8s.noResults') : t('k8s.noDeployments')}</Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{search || statusFilter !== 'ALL' ? t('k8s.adjustSearch') : t('k8s.createFirstDeployment')}</Typography>
                        {allowManage && !search && statusFilter === 'All' && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, fontWeight: 700 }}>{t('k8s.createDeployment')}</Button>
                        )}
                    </Card>
                </Fade>
            )}

            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                    {paginated.map((dep) => (
                        <K8sCard
                            key={dep.id}
                            dep={dep}
                            envName={envName}
                            hpaConfig={hpaConfigs[dep.id]}
                            allowManage={allowManage}
                            onScale={(d) => { setScaleReplicas(d.replicas); setScaleTarget(d); }}
                            onRestart={handleRestart}
                            onViewPods={handleViewPods}
                            onViewLogs={handleViewLogs}
                            onViewEvents={handleViewEvents}
                            onConfigureHpa={handleConfigureHpa}
                            onRollback={(d) => { setRollbackRevision(0); setRollbackTarget(d); }}
                            onDelete={(d) => setDeleteTarget(d)}
                        />
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={filtered.length} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <K8sDialogs
                scaleTarget={scaleTarget}
                scaleReplicas={scaleReplicas}
                onScaleReplicasChange={setScaleReplicas}
                onScaleClose={() => setScaleTarget(null)}
                onScaleConfirm={handleScale}
                deleteTarget={deleteTarget}
                onDeleteClose={() => setDeleteTarget(null)}
                onDeleteConfirm={handleDelete}
                podsTarget={podsTarget}
                pods={pods}
                podsLoading={podsLoading}
                podsTab={podsTab}
                onPodsTabChange={setPodsTab}
                events={events}
                onPodsClose={() => setPodsTarget(null)}
                logsTarget={logsTarget}
                logs={logs}
                logsLoading={logsLoading}
                onLogsClose={() => setLogsTarget(null)}
                eventsTarget={eventsTarget}
                eventsLoading={eventsLoading}
                onEventsClose={() => setEventsTarget(null)}
                hpaTarget={hpaTarget}
                hpaConfig={hpaTarget ? hpaConfigs[hpaTarget.id] ?? null : null}
                hpaMinReplicas={hpaMinReplicas}
                hpaMaxReplicas={hpaMaxReplicas}
                hpaCpuTarget={hpaCpuTarget}
                hpaMemoryTarget={hpaMemoryTarget}
                onHpaMinChange={setHpaMinReplicas}
                onHpaMaxChange={setHpaMaxReplicas}
                onHpaCpuChange={setHpaCpuTarget}
                onHpaMemoryChange={setHpaMemoryTarget}
                onHpaClose={() => setHpaTarget(null)}
                onHpaSave={handleHpaSave}
                onHpaDelete={handleHpaDelete}
                hpaSaving={hpaSaving}
                rollbackTarget={rollbackTarget}
                rollbackRevision={rollbackRevision}
                onRollbackRevisionChange={setRollbackRevision}
                onRollbackClose={() => setRollbackTarget(null)}
                onRollbackConfirm={handleRollback}
                rollbackSaving={rollbackSaving}
            />
        </Box>
    );
};

export default K8sDeploymentsPage;
