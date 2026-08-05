import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BackupIcon from '@mui/icons-material/Backup';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DevicesIcon from '@mui/icons-material/Devices';
import HubIcon from '@mui/icons-material/Hub';
import MemoryIcon from '@mui/icons-material/Memory';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
    Alert,
    Box,
    Typography
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    listAlerts,
    listCosts,
    type AlertResponse,
    type CostRecordResponse
} from '../../../services/cloudPricerService';
import {
    listDeploymentHistory,
    listEnvironments,
    listMetrics,
    listServices,
    type EnvironmentResponse,
    type HistoryEntry,
    type MetricResponse,
    type ServiceResponse
} from '../../../services/devopsService';
import { backupService } from '../../../services/backupService';
import { vmService } from '../../../services/VmService';
import { k8sService } from '../../../services/k8sService';
import type { Backup } from '../../../services/interfaces/backup';
import type { Vm } from '../../../services/interfaces/vm';
import type { K8sDeployment } from '../../../services/interfaces/k8s';
import KpiCard from './KpiCard';
import RecentDeploymentsSection from './RecentDeploymentsSection';
import EnvironmentsSection from './EnvironmentsSection';
import ServicesSection from './ServicesSection';
import RecentAlertsSection from './RecentAlertsSection';
import K8sDeploymentsSection from './K8sDeploymentsSection';
import MetricsOverviewSection from './MetricsOverviewSection';
import CostOverviewSection from './CostOverviewSection';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { C} from '../../../theme/tokens';

const DevopsDashboardPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [vms, setVms] = useState<Vm[]>([]);
    const [alerts, setAlerts] = useState<AlertResponse[]>([]);
    const [costs, setCosts] = useState<CostRecordResponse[]>([]);
    const [k8sDeployments, setK8sDeployments] = useState<K8sDeployment[]>([]);
    const [metrics, setMetrics] = useState<MetricResponse[]>([]);

    const fetchAll = useCallback(async () => {
        try {
            const [svc, dep, env, bak, vm, alrt, cst, k8, met] = await Promise.allSettled([
                listServices(),
                listDeploymentHistory(),
                listEnvironments(),
                backupService.getAll(),
                vmService.getAll(),
                listAlerts(),
                listCosts(),
                k8sService.getAll(),
                listMetrics()
            ]);
            if (svc.status === 'fulfilled') setServices(svc.value);
            if (dep.status === 'fulfilled') setHistory(dep.value);
            if (env.status === 'fulfilled') setEnvironments(env.value);
            if (bak.status === 'fulfilled') setBackups(bak.value);
            if (vm.status === 'fulfilled') setVms(vm.value);
            if (alrt.status === 'fulfilled') setAlerts(alrt.value);
            if (cst.status === 'fulfilled') setCosts(cst.value);
            if (k8.status === 'fulfilled') setK8sDeployments(k8.value);
            if (met.status === 'fulfilled') setMetrics(met.value);
        } catch (e: any) {
            setError(e?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    const pollMetrics = useCallback(async () => {
        try {
            const met = await listMetrics();
            if (Array.isArray(met)) setMetrics(met);
        } catch {
            // silent — polling shouldn't spam
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        const id = setInterval(() => {
            pollMetrics();
        }, 10_000);
        return () => clearInterval(id);
    }, [pollMetrics]);

    const activeServices = services.filter((s) => s.status?.toUpperCase() === 'ACTIVE').length;
    const failedServices = services.filter((s) => s.status?.toUpperCase() === 'FAILED').length;
    const openAlerts = alerts.filter((a) => a.status === 'OPEN');
    const criticalAlerts = openAlerts.filter((a) => a.severity === 'CRITICAL');
    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);

    if (loading) {
        return <LoadingSpinner variant="page" />;
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, color: C.text }}>
                    {t('dashboard.devops.title')}
                </Typography>
                <Typography sx={{ color: C.muted, mt: 0.5 }}>
                    {t('dashboard.devops.subtitle')}
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                    {t('dashboard.devops.helperText')}
                </Alert>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <KpiCard
                    title={t('dashboard.devops.kpiServices')}
                    value={services.length}
                    subtitle={t('dashboard.devops.activeFailed', { active: activeServices, failed: failedServices })}
                    icon={<HubIcon sx={{ color: C.brand, fontSize: 26 }} />}
                    bgColor={C.brandLight}
                    color={C.brand}
                    onClick={() => navigate('/admin/devops/services')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiDeployments')}
                    value={history.length}
                    subtitle={t('dashboard.devops.recordedActions', { count: history.length })}
                    icon={<PlayArrowIcon sx={{ color: '#2E5C8A', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#2E5C8A"
                    onClick={() => navigate('/admin/audit-logs')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiVirtualMachines')}
                    value={vms.length}
                    subtitle={t('dashboard.devops.vmStatus', { running: vms.filter((v) => v.status === 'RUNNING').length, total: vms.length })}
                    icon={<DevicesIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#F5F3FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/devops/vms')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiOpenAlerts')}
                    value={openAlerts.length}
                    subtitle={t('dashboard.devops.criticalCount', { count: criticalAlerts.length })}
                    icon={<NotificationsActiveIcon sx={{ color: criticalAlerts.length > 0 ? '#C95B6E' : '#2E7A4F', fontSize: 26 }} />}
                    bgColor={criticalAlerts.length > 0 ? '#F7DEE3' : '#E0F1E6'}
                    color={criticalAlerts.length > 0 ? '#C95B6E' : '#2E7A4F'}
                    onClick={() => navigate('/admin/devops/alerts')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <KpiCard
                    title={t('dashboard.devops.kpiEnvironments')}
                    value={environments.length}
                    subtitle={t('dashboard.devops.totalConfigured')}
                    icon={<CloudQueueIcon sx={{ color: '#2E7A4F', fontSize: 26 }} />}
                    bgColor="#ECFDF5"
                    color="#2E7A4F"
                    onClick={() => navigate('/admin/devops/environments')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiBackups')}
                    value={backups.length}
                    subtitle={t('dashboard.devops.totalBackups')}
                    icon={<BackupIcon sx={{ color: '#8A6A2E', fontSize: 26 }} />}
                    bgColor="#FFF7ED"
                    color="#8A6A2E"
                    onClick={() => navigate('/admin/devops/backups')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiTotalCost')}
                    value={`$${totalCost.toFixed(0)}`}
                    subtitle={t('dashboard.devops.recordsCount', { count: costs.length })}
                    icon={<AttachMoneyIcon sx={{ color: C.brand, fontSize: 26 }} />}
                    bgColor={C.brandLight}
                    color={C.brand}
                    onClick={() => navigate('/admin/devops/costs')}
                />
                <KpiCard
                    title={t('dashboard.devops.kpiK8sDeployments')}
                    value={k8sDeployments.length}
                    subtitle={t('dashboard.devops.k8sStatus', { running: k8sDeployments.filter((d) => d.status === 'RUNNING' || d.status === 'ACTIVE').length, total: k8sDeployments.length })}
                    icon={<AccountTreeIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#FDF4FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/devops/k8s')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5, mb: 3 }}>
                <EnvironmentsSection environments={environments} services={services} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
                <ServicesSection services={services} />
                <RecentAlertsSection alerts={alerts} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
                <K8sDeploymentsSection deployments={k8sDeployments} />
                <RecentDeploymentsSection history={history} />
            </Box>

            <MetricsOverviewSection metrics={metrics} />

            <CostOverviewSection costs={costs} />
        </Box>
    );
};

export default DevopsDashboardPage;
