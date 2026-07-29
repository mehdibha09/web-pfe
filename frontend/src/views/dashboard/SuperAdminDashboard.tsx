import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DnsIcon from '@mui/icons-material/Dns';
import HistoryIcon from '@mui/icons-material/History';
import HubIcon from '@mui/icons-material/Hub';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import RestorePageIcon from '@mui/icons-material/RestorePage';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WidgetsIcon from '@mui/icons-material/Widgets';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Typography
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    listUsers,
    listRoles,
    listTenants,
    listSessions,
    listAuditLogs,
    type UserResponse,
    type RoleResponse,
    type TenantResponse,
    type SessionResponse,
    type AuditLogResponse
} from '../../services/adminService';
import { vmService, type Vm } from '../../services/VmService';
import { k8sService, type K8sDeployment } from '../../services/k8sService';
import { backupService, type Backup } from '../../services/backupService';
import { listAlerts, listCosts, type AlertResponse, type CostRecordResponse } from '../../services/cloudPricerService';
import { C } from '../../theme/tokens';
import {
    listServices,
    listDeployments,
    type ServiceResponse,
    type DeploymentResponse
} from '../../services/devopsService';
import LoadingSpinner from '../../components/LoadingSpinner';
import DashboardKpiCard from './DashboardKpiCard';

const actionColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD')) return { bg: '#E0F1E6', fg: '#2E7A4F' };
    if (a.includes('DELETE') || a.includes('REVOKE')) return { bg: '#F7DEE3', fg: '#A23B4E' };
    if (a.includes('UPDATE') || a.includes('PATCH')) return { bg: '#F7ECD6', fg: '#8A6A2E' };
    if (a.includes('LOGIN')) return { bg: '#E4EEF7', fg: '#2E5C8A' };
    return { bg: '#F3F4F6', fg: '#6B7280' };
};

const statusColor = (s: string) => {
    const up = s?.toUpperCase();
    if (up === 'ACTIVE') return { bg: '#E0F1E6', fg: '#2E7A4F' };
    if (up === 'INVITED') return { bg: '#E4EEF7', fg: '#2E5C8A' };
    return { bg: '#F3F4F6', fg: '#6B7280' };
};

const SuperAdminDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [tenants, setTenants] = useState<TenantResponse[]>([]);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [deployments, setDeployments] = useState<DeploymentResponse[]>([]);
    const [vms, setVms] = useState<Vm[]>([]);
    const [k8sDeployments, setK8sDeployments] = useState<K8sDeployment[]>([]);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [alerts, setAlerts] = useState<AlertResponse[]>([]);
    const [costs, setCosts] = useState<CostRecordResponse[]>([]);

    const fetchAll = useCallback(async () => {
        try {
            const [u, r, ten, s, a, svc, dep, vm, k8, bak, al, co] = await Promise.allSettled([
                listUsers(),
                listRoles(),
                listTenants(),
                listSessions(),
                listAuditLogs({}),
                listServices(),
                listDeployments(),
                vmService.getAll(),
                k8sService.getAll(),
                backupService.getAll(),
                listAlerts(),
                listCosts()
            ]);
            if (u.status === 'fulfilled') setUsers(u.value);
            if (r.status === 'fulfilled') setRoles(r.value);
            if (ten.status === 'fulfilled') setTenants(ten.value);
            if (s.status === 'fulfilled') setSessions(s.value);
            if (a.status === 'fulfilled') setAuditLogs(a.value);
            if (svc.status === 'fulfilled') setServices(svc.value);
            if (dep.status === 'fulfilled') setDeployments(dep.value);
            if (vm.status === 'fulfilled') setVms(vm.value);
            if (k8.status === 'fulfilled') setK8sDeployments(k8.value);
            if (bak.status === 'fulfilled') setBackups(bak.value);
            if (al.status === 'fulfilled') setAlerts(al.value);
            if (co.status === 'fulfilled') setCosts(co.value);
        } catch (e: any) {
            setError(e?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const activeUsers = users.filter((u) => u.status?.toUpperCase() === 'ACTIVE').length;
    const activeTenants = tenants.filter((ten) => ten.status?.toUpperCase() === 'ACTIVE').length;
    const activeSessions = sessions.filter((s) => !s.revokedAt).length;
    const successDeployments = deployments.filter((d) => d.status?.toUpperCase() === 'SUCCESS').length;
    const recentAudit = [...auditLogs]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 6);
    const recentSessions = [...sessions]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

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
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(160deg, #FAF8FF 0%, #F5F0FA 50%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Box sx={{ width: 3, height: 28, borderRadius: 2, backgroundColor: C.brand }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
                        {t('dashboard.superAdmin.title')}
                    </Typography>
                </Box>
                <Typography sx={{ color: C.muted, ml: 4.5 }}>
                    {t('dashboard.superAdmin.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiUsers')}
                    value={users.length}
                    subtitle={t('dashboard.superAdmin.activeCount', { count: activeUsers })}
                    icon={<PeopleIcon sx={{ color: C.brand, fontSize: 26 }} />}
                    bgColor={C.brandLight}
                    color={C.brand}
                    onClick={() => navigate('/admin/users')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiRoles')}
                    value={roles.length}
                    subtitle={t('dashboard.superAdmin.definedRoles')}
                    icon={<SecurityIcon sx={{ color: '#2E5C8A', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#2E5C8A"
                    onClick={() => navigate('/admin/roles')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiTenants')}
                    value={tenants.length}
                    subtitle={t('dashboard.superAdmin.activeCount', { count: activeTenants })}
                    icon={<VerifiedUserIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#F5F3FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/tenants')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiSessions')}
                    value={sessions.length}
                    subtitle={t('dashboard.superAdmin.activeCount', { count: activeSessions })}
                    icon={<VpnKeyIcon sx={{ color: '#8A6A2E', fontSize: 26 }} />}
                    bgColor="#FFF7ED"
                    color="#8A6A2E"
                    onClick={() => navigate('/admin/sessions')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiServices')}
                    value={services.length}
                    subtitle={t('dashboard.superAdmin.devopsServices')}
                    icon={<HubIcon sx={{ color: '#2E7A4F', fontSize: 26 }} />}
                    bgColor="#ECFDF5"
                    color="#2E7A4F"
                    onClick={() => navigate('/admin/devops/services')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiDeployments')}
                    value={deployments.length}
                    subtitle={t('dashboard.superAdmin.succeededCount', { count: successDeployments })}
                    icon={<TrendingUpIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#FDF4FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/devops/deployments')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiAuditLogs')}
                    value={auditLogs.length}
                    subtitle={t('dashboard.superAdmin.recordedEvents')}
                    icon={<HistoryIcon sx={{ color: '#0EA5E9', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#0EA5E9"
                    onClick={() => navigate('/admin/audit-logs')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiAssignments')}
                    value={roles.reduce((sum, r) => sum + (r.permissions?.length || 0), 0)}
                    subtitle={t('dashboard.superAdmin.acrossRoles', { count: roles.length })}
                    icon={<AssignmentIcon sx={{ color: C.muted, fontSize: 26 }} />}
                    bgColor="#F8FAFC"
                    color={C.muted}
                    onClick={() => navigate('/admin/permissions')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiVms')}
                    value={vms.length}
                    subtitle={t('dashboard.superAdmin.runningCount', { count: vms.filter((v) => v.status === 'RUNNING').length })}
                    icon={<DnsIcon sx={{ color: '#0EA5E9', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#0EA5E9"
                    onClick={() => navigate('/admin/vms')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiK8s')}
                    value={k8sDeployments.length}
                    subtitle={t('dashboard.superAdmin.k8sDeployments')}
                    icon={<WidgetsIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#F5F3FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/kubernetes')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiBackups')}
                    value={backups.length}
                    subtitle={t('dashboard.superAdmin.backupRecords')}
                    icon={<RestorePageIcon sx={{ color: '#2E7A4F', fontSize: 26 }} />}
                    bgColor="#ECFDF5"
                    color="#2E7A4F"
                    onClick={() => navigate('/admin/backups')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiAlerts')}
                    value={alerts.filter((a) => a.status === 'OPEN').length}
                    subtitle={t('dashboard.superAdmin.openAlertsCount', { count: alerts.length })}
                    icon={<WarningAmberIcon sx={{ color: '#A23B4E', fontSize: 26 }} />}
                    bgColor="#FDF2F4"
                    color="#A23B4E"
                    onClick={() => navigate('/admin/alerts')}
                />
                <DashboardKpiCard
                    title={t('dashboard.superAdmin.kpiCosts')}
                    value={costs.length}
                    subtitle={t('dashboard.superAdmin.costRecords')}
                    icon={<PaymentsIcon sx={{ color: '#B45309', fontSize: 26 }} />}
                    bgColor="#FFFAF0"
                    color="#B45309"
                    onClick={() => navigate('/admin/costs')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: '#FFFFFF', position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.superAdmin.recentActivity')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.superAdmin.latestAuditLogs')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.superAdmin.totalCount', { count: auditLogs.length })}
                                size="small"
                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: C.border }} />
                        {recentAudit.length === 0 ? (
                            <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                                {t('dashboard.superAdmin.noAuditLogs')}
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {recentAudit.map((log) => {
                                    const ac = actionColor(log.action);
                                    return (
                                        <Box
                                            key={log.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1.5,
                                                borderRadius: 2,
                                                border: `1px solid ${C.border}`,
                                                backgroundColor: '#FFFFFF',
                                                transition: 'background-color 0.15s',
                                                '&:hover': { backgroundColor: '#FFF8FA' }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 1.5,
                                                    backgroundColor: ac.bg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <Typography sx={{ fontSize: 11, fontWeight: 800, color: ac.fg }}>
                                                    {log.action?.slice(0, 3).toUpperCase()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                    {log.action}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        color: C.muted,
                                                        fontSize: 11,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {log.userEmail || log.userId} · {log.resource}
                                                    {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: C.subtle, fontSize: 10, flexShrink: 0 }}>
                                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: '#FFFFFF', position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2E5C8A, #6366F1)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.superAdmin.activeSessions')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.superAdmin.currentUserSessions')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.superAdmin.activeLabel', { count: activeSessions })}
                                size="small"
                                sx={{
                                    backgroundColor: activeSessions > 0 ? '#E0F1E6' : '#F3F4F6',
                                    color: activeSessions > 0 ? '#2E7A4F' : '#6B7280',
                                    fontWeight: 700
                                }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: C.border }} />
                        {recentSessions.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 40, mb: 1 }} />
                                <Typography sx={{ color: C.subtle }}>
                                    {t('dashboard.superAdmin.noActiveSessions')}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {recentSessions.map((sess) => (
                                    <Box
                                        key={sess.id}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: `1px solid ${sess.revokedAt ? '#F7DEE3' : C.border}`,
                                            backgroundColor: sess.revokedAt ? '#FFFBFB' : '#FFFFFF',
                                            transition: 'background-color 0.15s',
                                            '&:hover': { backgroundColor: sess.revokedAt ? '#FFF5F5' : '#FFF8FA' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PersonIcon sx={{ fontSize: 16, color: C.muted }} />
                                                <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                    {sess.userEmail || t('dashboard.superAdmin.unknown')}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={sess.revokedAt ? t('dashboard.superAdmin.statusRevoked') : t('dashboard.superAdmin.statusActive')}
                                                size="small"
                                                sx={{
                                                    backgroundColor: sess.revokedAt ? '#F7DEE3' : '#E0F1E6',
                                                    color: sess.revokedAt ? '#A23B4E' : '#2E7A4F',
                                                    fontWeight: 700,
                                                    fontSize: 10
                                                }}
                                            />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                            {sess.browser || t('dashboard.superAdmin.unknownBrowser')} · {sess.os || t('dashboard.superAdmin.unknownOS')}
                                        </Typography>
                                        <Typography sx={{ color: C.subtle, fontSize: 10, mt: 0.5 }}>
                                            {sess.createdAt ? new Date(sess.createdAt).toLocaleString() : ''}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: '#FFFFFF', position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #5E4B9E, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.superAdmin.tenants')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.superAdmin.registeredTenants')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.superAdmin.tenantActiveCount', { active: activeTenants, total: tenants.length })}
                                size="small"
                                sx={{
                                    backgroundColor: activeTenants === tenants.length ? '#E0F1E6' : '#F7ECD6',
                                    color: activeTenants === tenants.length ? '#2E7A4F' : '#8A6A2E',
                                    fontWeight: 700
                                }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: C.border }} />
                        {tenants.length === 0 ? (
                            <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                                {t('dashboard.superAdmin.noTenants')}
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {tenants.slice(0, 5).map((ten) => {
                                    const isActive = ten.status?.toUpperCase() === 'ACTIVE';
                                    const sc = statusColor(ten.status || '');
                                    return (
                                    <Box
                                        key={ten.id}
                                        onClick={() => navigate(`/admin/tenants/${ten.id}`)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.25,
                                            borderRadius: 2,
                                            border: `1px solid ${C.border}`,
                                            backgroundColor: '#FFFFFF',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.15s',
                                            '&:hover': { backgroundColor: '#FFF8FA' }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: sc.fg,
                                                flexShrink: 0
                                            }}
                                        />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                {ten.name}
                                            </Typography>
                                            <Typography sx={{ color: C.muted, fontSize: 11 }}>
                                                {ten.contactEmail || t('dashboard.superAdmin.noEmail')} · {ten.modeDeployment || t('dashboard.superAdmin.na')}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 11, mr: 1 }}>
                                            {t('dashboard.superAdmin.usersCount', { count: ten.usersCount || 0 })}
                                        </Typography>
                                        <Typography sx={{ color: C.brand, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                                            {t('dashboard.superAdmin.viewDetails')}
                                        </Typography>
                                    </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: '#FFFFFF', position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2E5C8A, #5E4B9E)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.superAdmin.rolesPermissions')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.superAdmin.roleDefinitions')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.superAdmin.rolesCount', { count: roles.length })}
                                size="small"
                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: C.border }} />
                        {roles.length === 0 ? (
                            <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                                {t('dashboard.superAdmin.noRoles')}
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {roles.slice(0, 5).map((r, idx) => {
                                    const palette = [
                                        { border: '#2E7A4F', bg: '#F0F9F4' },
                                        { border: '#2E5C8A', bg: '#F0F4F8' },
                                        { border: '#5E4B9E', bg: '#F5F2FA' },
                                        { border: '#A23B4E', bg: '#FDF2F4' },
                                        { border: '#B45309', bg: '#FFFAF0' },
                                    ];
                                    const c = palette[idx % palette.length];
                                    return (
                                    <Box
                                        key={r.id}
                                        sx={{
                                            p: 1.25,
                                            borderRadius: 2,
                                            border: `1px solid ${C.border}`,
                                            borderLeft: `4px solid ${c.border}`,
                                            backgroundColor: c.bg,
                                            transition: 'background-color 0.15s',
                                            '&:hover': { backgroundColor: c.bg }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                {r.name}
                                            </Typography>
                                            <Chip
                                                label={t('dashboard.superAdmin.permsCount', { count: r.permissions?.length || 0 })}
                                                size="small"
                                                sx={{ backgroundColor: '#E4EEF7', color: '#2E5C8A', fontWeight: 700, fontSize: 10 }}
                                            />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                            {r.description || t('dashboard.superAdmin.noDescription')}
                                        </Typography>
                                        {r.permissions && r.permissions.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                                                {r.permissions.slice(0, 3).map((p) => (
                                                    <Chip
                                                        key={p}
                                                        label={p}
                                                        size="small"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: 9,
                                                            backgroundColor: '#F8FAFC',
                                                            color: C.muted,
                                                            border: '1px solid #E2E8F0'
                                                        }}
                                                    />
                                                ))}
                                                {r.permissions.length > 3 && (
                                                    <Typography sx={{ fontSize: 10, color: C.subtle, alignSelf: 'center' }}>
                                                        {t('dashboard.superAdmin.moreCount', { count: r.permissions.length - 3 })}
                                                    </Typography>
                                                )}
                                            </Box>
                                                    )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default SuperAdminDashboard;
