import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DevicesIcon from '@mui/icons-material/Devices';
import HubIcon from '@mui/icons-material/Hub';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
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
import { listServices, listDeploymentHistory, type ServiceResponse, type HistoryEntry } from '../../services/devopsService';
import { listAlerts, listCosts, type AlertResponse, type CostRecordResponse } from '../../services/cloudPricerService';
import { listNotifications, type NotificationResponse } from '../../services/notificationService';
import { getStoredUser } from '../../services/authStorage';
import { C } from '../../theme/tokens';
import LoadingSpinner from '../../components/LoadingSpinner';
import DashboardKpiCard from './DashboardKpiCard';

const formatCurrency = (value: number) =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

const StandardUserDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [alerts, setAlerts] = useState<AlertResponse[]>([]);
    const [costs, setCosts] = useState<CostRecordResponse[]>([]);
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);

    const fetchAll = useCallback(async () => {
        const user = getStoredUser();
        try {
            const [svc, dep, al, co, no] = await Promise.allSettled([
                listServices(),
                listDeploymentHistory(),
                listAlerts(),
                listCosts(),
                user ? listNotifications(user.userId) : Promise.resolve([] as NotificationResponse[])
            ]);
            if (svc.status === 'fulfilled') setServices(svc.value);
            if (dep.status === 'fulfilled') setHistory(dep.value);
            if (al.status === 'fulfilled') setAlerts(al.value);
            if (co.status === 'fulfilled') setCosts(co.value);
            if (no.status === 'fulfilled') setNotifications(no.value);
        } catch (e: any) {
            setError(e?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const openAlerts = alerts.filter((al) => al.status?.toUpperCase() === 'OPEN');
    const unreadNotifications = notifications.filter((n) => !n.read);
    const totalCost = costs.reduce((sum, c) => sum + (c.totalCost || 0), 0);
    const recentAlerts = [...openAlerts]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
    const recentNotifications = [...notifications]
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
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: C.text }}>
                    {t('dashboard.standardUser.title')}
                </Typography>
                <Typography sx={{ color: C.muted, mt: 0.5 }}>
                    {t('dashboard.standardUser.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                <DashboardKpiCard
                    title={t('dashboard.standardUser.kpiServices')}
                    value={services.length}
                    subtitle={t('dashboard.standardUser.availableServices')}
                    icon={<HubIcon sx={{ color: '#2E7A4F', fontSize: 26 }} />}
                    bgColor="#ECFDF5"
                    color="#2E7A4F"
                    onClick={() => navigate('/admin/devops/services')}
                />
                <DashboardKpiCard
                    title={t('dashboard.standardUser.kpiDeployments')}
                    value={history.length}
                    subtitle={t('dashboard.standardUser.recordedActions', { count: history.length })}
                    icon={<DevicesIcon sx={{ color: '#5E4B9E', fontSize: 26 }} />}
                    bgColor="#FDF4FF"
                    color="#5E4B9E"
                    onClick={() => navigate('/admin/audit-logs')}
                />
                <DashboardKpiCard
                    title={t('dashboard.standardUser.kpiOpenAlerts')}
                    value={openAlerts.length}
                    subtitle={t('dashboard.standardUser.requireAttention')}
                    icon={<WarningAmberIcon sx={{ color: '#A23B4E', fontSize: 26 }} />}
                    bgColor="#FDE8EC"
                    color="#A23B4E"
                    onClick={() => navigate('/admin/devops/alerts')}
                />
                <DashboardKpiCard
                    title={t('dashboard.standardUser.kpiTotalCost')}
                    value={formatCurrency(totalCost)}
                    subtitle={t('dashboard.standardUser.recordsCount', { count: costs.length })}
                    icon={<AttachMoneyIcon sx={{ color: '#8A6A2E', fontSize: 26 }} />}
                    bgColor="#FFF7ED"
                    color="#8A6A2E"
                    onClick={() => navigate('/admin/devops/costs')}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.standardUser.openAlerts')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.standardUser.activeAlertsDesc')}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.standardUser.openCount', { count: openAlerts.length })}
                                size="small"
                                sx={{ backgroundColor: '#FDE8EC', color: '#A23B4E', fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                        {recentAlerts.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 40, mb: 1 }} />
                                <Typography sx={{ color: C.subtle }}>
                                    {t('dashboard.standardUser.noOpenAlerts')}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {recentAlerts.map((al) => (
                                    <Box
                                        key={al.id}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid #F5D8E4',
                                            backgroundColor: '#FFFFFF'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                {al.metric || al.type || t('dashboard.standardUser.alertLabel')}
                                            </Typography>
                                            <Chip
                                                label={al.severity || al.status}
                                                size="small"
                                                sx={{ backgroundColor: '#FDE8EC', color: '#A23B4E', fontWeight: 700, fontSize: 10 }}
                                            />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                            {al.message || al.createdAt ? new Date(al.createdAt).toLocaleString() : ''}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                                    {t('dashboard.standardUser.recentNotifications')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 13 }}>
                                    {t('dashboard.standardUser.unreadCount', { count: unreadNotifications.length })}
                                </Typography>
                            </Box>
                            <Chip
                                label={t('dashboard.standardUser.totalCount', { count: notifications.length })}
                                size="small"
                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
                        {recentNotifications.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <NotificationsNoneIcon sx={{ color: C.subtle, fontSize: 40, mb: 1 }} />
                                <Typography sx={{ color: C.subtle }}>
                                    {t('dashboard.standardUser.noNotifications')}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {recentNotifications.map((n) => (
                                    <Box
                                        key={n.id}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: `1px solid ${n.read ? '#F5D8E4' : C.brandLight}`,
                                            backgroundColor: n.read ? '#FFFFFF' : '#FFF8FA'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                                                {n.title || n.type || t('dashboard.standardUser.notificationLabel')}
                                            </Typography>
                                            {!n.read && (
                                                <NotificationsActiveIcon sx={{ fontSize: 16, color: C.brand }} />
                                            )}
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 11, mt: 0.5 }}>
                                            {n.message || ''}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default StandardUserDashboard;
