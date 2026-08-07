import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DevicesIcon from '@mui/icons-material/Devices';
import HistoryIcon from '@mui/icons-material/History';
import HubIcon from '@mui/icons-material/Hub';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
    listSessions,
    listAuditLogs,
    type UserResponse,
    type RoleResponse,
    type SessionResponse,
    type AuditLogResponse
} from '../../services/adminService';
import { listServices, listDeploymentHistory, type ServiceResponse, type HistoryEntry } from '../../services/devopsService';
import { listAlerts, type AlertResponse } from '../../services/cloudPricerService';
import { C } from '../../theme/tokens';
import LoadingSpinner from '../../components/LoadingSpinner';
import DashboardKpiCard from './DashboardKpiCard';
import { getStoredUser } from '../../services/authStorage';
import { canAccessAlerts } from '../../services/authorization';

const actionColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD')) return { bg: '#E0F1E6', fg: '#2E7A4F' };
    if (a.includes('DELETE') || a.includes('REVOKE')) return { bg: '#F7DEE3', fg: '#A23B4E' };
    if (a.includes('UPDATE') || a.includes('PATCH')) return { bg: '#F7ECD6', fg: '#8A6A2E' };
    if (a.includes('LOGIN')) return { bg: '#E4EEF7', fg: '#2E5C8A' };
    return { bg: '#F3F4F6', fg: '#6B7280' };
};

const TenantAdminDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [alerts, setAlerts] = useState<AlertResponse[]>([]);

    const fetchAll = useCallback(async () => {
        const user = getStoredUser();
        try {
            const [u, r, s, a, svc, dep, al] = await Promise.allSettled([
                listUsers(),
                listRoles(),
                listSessions(),
                listAuditLogs({}),
                listServices(),
                listDeploymentHistory(),
                user && canAccessAlerts(user) ? listAlerts() : Promise.resolve([] as AlertResponse[])
            ]);
            if (u.status === 'fulfilled') setUsers(u.value);
            if (r.status === 'fulfilled') setRoles(r.value);
            if (s.status === 'fulfilled') setSessions(s.value);
            if (a.status === 'fulfilled') setAuditLogs(a.value);
            if (svc.status === 'fulfilled') setServices(svc.value);
            if (dep.status === 'fulfilled') setHistory(dep.value);
            if (al.status === 'fulfilled') setAlerts(al.value);
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
    const activeSessions = sessions.filter((s) => !s.revokedAt).length;
    const openAlerts = alerts.filter((al) => al.status?.toUpperCase() === 'OPEN');
    const recentAudit = [...auditLogs]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 6);
    const recentDeployments = [...history]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
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
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: C.text }}>
                    {t('dashboard.tenantAdmin.title')}
                </Typography>
                <Typography sx={{ color: C.muted, mt: 0.5 }}>
                    {t('dashboard.tenantAdmin.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiUsers')}
                    value={users.length}
                    subtitle={t('dashboard.tenantAdmin.activeCount', { count: activeUsers })}
                    icon={<PeopleIcon sx={{ color: C.brand, fontSize: 26 }} />}
                    bgColor={C.brandLight}
                    color={C.brand}
                    onClick={() => navigate('/admin/users')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiRoles')}
                    value={roles.length}
                    subtitle={t('dashboard.tenantAdmin.tenantRoles')}
                    icon={<SecurityIcon sx={{ color: '#2E5C8A', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#2E5C8A"
                    onClick={() => navigate('/admin/roles')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiServices')}
                    value={services.length}
                    subtitle={t('dashboard.tenantAdmin.devopsServices')}
                    icon={<HubIcon sx={{ color: '#2E7A4F', fontSize: 26 }} />}
                    bgColor="#ECFDF5"
                    color="#2E7A4F"
                    onClick={() => navigate('/admin/devops/services')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiDeployments')}
                    value={history.length}
                    subtitle={t('dashboard.tenantAdmin.recordedActions', { count: history.length })}
                    icon={<TrendingUpIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#FDF4FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/audit-logs')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiActiveAlerts')}
                    value={openAlerts.length}
                    subtitle={t('dashboard.tenantAdmin.requireAttention')}
                    icon={<WarningAmberIcon sx={{ color: '#A23B4E', fontSize: 26 }} />}
                    bgColor="#FDE8EC"
                    color="#A23B4E"
                    onClick={() => navigate('/admin/devops/alerts')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiAuditLogs')}
                    value={auditLogs.length}
                    subtitle={t('dashboard.tenantAdmin.recordedEvents')}
                    icon={<HistoryIcon sx={{ color: '#0EA5E9', fontSize: 26 }} />}
                    bgColor="#E4EEF7"
                    color="#0EA5E9"
                    onClick={() => navigate('/admin/audit-logs')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiSessions')}
                    value={sessions.length}
                    subtitle={t('dashboard.tenantAdmin.activeCount', { count: activeSessions })}
                    icon={<PersonIcon sx={{ color: '#8A6A2E', fontSize: 26 }} />}
                    bgColor="#FFF7ED"
                    color="#8A6A2E"
                    onClick={() => navigate('/admin/sessions')}
                />
                <DashboardKpiCard
                    title={t('dashboard.tenantAdmin.kpiEnvironments')}
                    value={services.length}
                    subtitle={t('dashboard.tenantAdmin.managedServices')}
                    icon={<DevicesIcon sx={{ color: '#2E5A9E', fontSize: 26 }} />}
                    bgColor="#EAF1FB"
                    color="#2E5A9E"
                    onClick={() => navigate('/admin/devops/services')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.tenantAdmin.recentActivity')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.tenantAdmin.latestAuditLogs')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.tenantAdmin.totalCount', { count: auditLogs.length })}
                                size="small"
                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                        {recentAudit.length === 0 ? (
                            <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                                {t('dashboard.tenantAdmin.noAuditLogs')}
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
                                                border: '1px solid #F5D8E4',
                                                backgroundColor: '#FFFFFF',
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

                <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.tenantAdmin.deploymentActivity')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.tenantAdmin.latestDeploymentActions')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.tenantAdmin.totalCount', { count: history.length })}
                                size="small"
                                sx={{ backgroundColor: '#FDF4FF', color: '#5E4B9E', fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                        {recentDeployments.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 40, mb: 1 }} />
                                <Typography sx={{ color: C.subtle }}>
                                    {t('dashboard.tenantAdmin.noDeployments')}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {recentDeployments.map((entry) => {
                                    const ac = actionColor(entry.action);
                                    return (
                                        <Box
                                            key={entry.id}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                border: '1px solid #F5D8E4',
                                                backgroundColor: '#FFFFFF'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <TrendingUpIcon sx={{ fontSize: 16, color: ac.fg }} />
                                                    <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                        {entry.action}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={entry.action.slice(0, 3).toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: ac.bg,
                                                        color: ac.fg,
                                                        fontWeight: 700,
                                                        fontSize: 10
                                                    }}
                                                />
                                            </Box>
                                            <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                                {entry.resource || '—'}
                                                {entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ''} ·{' '}
                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                                            </Typography>
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

export default TenantAdminDashboard;
