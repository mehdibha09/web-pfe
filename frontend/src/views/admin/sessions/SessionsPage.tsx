import {
    Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import BlockIcon from '@mui/icons-material/Block';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import DevicesIcon from '@mui/icons-material/Devices';
import SearchIcon from '@mui/icons-material/Search';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TabletIcon from '@mui/icons-material/Tablet';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import { listSessions, listSessionsPaginated, revokeSession } from '../../../services/adminService';
import { canRevokeSession } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';
import { C} from '../../../theme/tokens';

type SessionItem = {
    id: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    location: string;
    createdAt: string;
    lastActive: string;
    status: 'ACTIVE' | 'REVOKED';
};

const getDeviceType = (os: string): string => {
    if (!os || os === 'Unknown') return 'Desktop';
    const normalized = os.toLowerCase();
    if (
        normalized.includes('mobile') ||
        normalized.includes('android') ||
        normalized.includes('ios') ||
        normalized.includes('iphone') ||
        normalized.includes('ipad')
    ) {
        return 'Mobile Device';
    }
    if (normalized.includes('tablet')) {
        return 'Tablet';
    }
    return 'Desktop';
};

const toSessionItem = (session: any): SessionItem => ({
    id: String(session.id),
    deviceType: getDeviceType(session.os),
    browser: session.browser || 'Unknown Browser',
    os: session.os || 'Unknown OS',
    ipAddress: session.ipAddress || '-',
    location: session.localization || 'Unknown',
    createdAt: session.createdAt ? new Date(session.createdAt).toLocaleString() : '-',
    lastActive: session.expirationDate ? new Date(session.expirationDate).toLocaleString() : '-',
    status: session.revokedAt ? 'REVOKED' : 'ACTIVE'
});

const SessionsPage = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [ipFilter, setIpFilter] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(getStoredUser());
    const [revokeDialogId, setRevokeDialogId] = useState<string | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const allowRevokeSession = currentUser ? canRevokeSession(currentUser) : false;

    const deviceIcon = (os: string) => {
        const n = os.toLowerCase();
        if (n.includes('mobile') || n.includes('android') || n.includes('ios') || n.includes('iphone')) return <SmartphoneIcon />;
        if (n.includes('ipad') || n.includes('tablet')) return <TabletIcon />;
        return <DesktopWindowsIcon />;
    };

    const loadSessions = async () => {
        setLoading(true);
        try {
            const result = await listSessionsPaginated(page, PAGE_SIZE);
            setSessions(result.items.map(toSessionItem));
            setTotalElements(result.total);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.sessions.failedToLoadSessions');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [page]);

    useEffect(() => {
        if (page >= pageCount && page > 0) setPage(pageCount - 1);
    }, [totalElements]);

    useEffect(() => {
        const syncUser = () => setCurrentUser(getStoredUser());

        window.addEventListener('authUserUpdated', syncUser);
        window.addEventListener('storage', syncUser);

        return () => {
            window.removeEventListener('authUserUpdated', syncUser);
            window.removeEventListener('storage', syncUser);
        };
    }, []);

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            const matchesSearch = search
                ? [session.deviceType, session.browser, session.os, session.location, session.ipAddress, session.status]
                      .join(' ')
                      .toLowerCase()
                      .includes(search.toLowerCase())
                : true;
            const matchesIp = ipFilter
                ? session.ipAddress.toLowerCase().includes(ipFilter.toLowerCase())
                : true;
            const matchesStatus = filterStatus ? session.status === filterStatus : true;
            return matchesSearch && matchesIp && matchesStatus;
        });
    }, [filterStatus, ipFilter, search, sessions]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleRevokeSession = async (id: string) => {
        if (!allowRevokeSession) {
            toast.error(t('admin.sessions.noPermissionRevoke'));
            return;
        }

        try {
            await revokeSession(id);
            toast.success(t('admin.sessions.sessionRevoked'));
            await loadSessions();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.sessions.failedToRevokeSession');
            toast.error(message);
        }
    };

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.sessions.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.sessions.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {[
                    { label: t('admin.sessions.activeSessions'), value: sessions.filter((s) => s.status === 'ACTIVE').length, icon: <DevicesIcon />, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
                    { label: t('admin.sessions.revokedSessions'), value: sessions.filter((s) => s.status === 'REVOKED').length, icon: <BlockIcon />, gradient: 'linear-gradient(135deg, #EF4444, #F87171)' },
                    { label: t('admin.sessions.visibleSessions'), value: filteredSessions.length, icon: <VisibilityIcon />, gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' }
                ].map((stat) => (
                    <Card key={stat.label} sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stat.gradient, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 3 }}>
                            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: stat.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                {stat.icon}
                            </Box>
                            <Box>
                                <Typography variant="overline" sx={{ color: C.muted, lineHeight: 1 }}>
                                    {stat.label}
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: C.text }}>
                                    {stat.value}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            <Card sx={{ borderRadius: 3, mb: 3, position: 'relative', overflow: 'visible' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent sx={{ pt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SearchIcon sx={{ color: '#0EA5E9' }} />
                        {t('admin.sessions.filterSessions')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('common.search')}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('admin.sessions.searchPlaceholder')}
                            size="small"
                        />
                        <TextField
                            label={t('admin.sessions.ipFilter')}
                            value={ipFilter}
                            onChange={(event) => setIpFilter(event.target.value)}
                            placeholder={t('admin.sessions.ipPlaceholder')}
                            size="small"
                        />
                        <TextField
                            select
                            label={t('admin.sessions.statusFilter')}
                            value={filterStatus}
                            onChange={(event) => setFilterStatus(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            <MenuItem value="ACTIVE">{t('admin.sessions.active')}</MenuItem>
                            <MenuItem value="REVOKED">{t('admin.sessions.revoked')}</MenuItem>
                        </TextField>
                    </Box>
                </CardContent>
            </Card>

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filteredSessions.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <DeviceHubIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.sessions.noSessionsFound')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('admin.sessions.tryAdjustingFilter')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {filteredSessions.map((session) => (
                        <Card
                            key={session.id}
                            sx={{
                                borderRadius: 3,
                                position: 'relative',
                                overflow: 'visible',
                                opacity: session.status === 'REVOKED' ? 0.7 : 1,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(124,58,237,0.1)' }
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                    background: session.status === 'ACTIVE'
                                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                                        : 'linear-gradient(90deg, #EF4444, #F87171)',
                                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                                }}
                            />
                            <CardContent sx={{ pt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        <Box sx={{ color: session.status === 'ACTIVE' ? '#10B981' : '#EF4444' }}>
                                            {deviceIcon(session.os)}
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                                {session.deviceType}
                                            </Typography>
                                            <Typography sx={{ color: C.muted }}>
                                                {session.browser} &middot; {session.os}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip
                                        label={session.status}
                                        size="small"
                                        sx={{
                                            backgroundColor: session.status === 'ACTIVE' ? '#E0F1E6' : '#F7DEE3',
                                            color: session.status === 'ACTIVE' ? '#2E7A4F' : '#A23B4E',
                                            fontWeight: 700,
                                            flexShrink: 0
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.sessions.ipAddress')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{session.ipAddress}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.sessions.location')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{session.location}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.sessions.createdAt')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{session.createdAt}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.sessions.lastActive')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{session.lastActive}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                                {session.status === 'ACTIVE' ? (
                                    <Button
                                        onClick={() => setRevokeDialogId(session.id)}
                                        disabled={!allowRevokeSession}
                                        startIcon={<BlockIcon />}
                                        variant="text"
                                        sx={{ color: '#DC2626', background: 'transparent', '&:hover': { background: 'rgba(220,38,38,0.08)' } }}
                                    >
                                        {t('admin.sessions.revoke')}
                                    </Button>
                                ) : (
                                    <Typography variant="caption" sx={{ color: C.muted, fontStyle: 'italic' }}>
                                        {t('admin.sessions.revoked')}
                                    </Typography>
                                )}
                            </CardActions>
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={!!revokeDialogId} onClose={() => setRevokeDialogId(null)}>
                <DialogTitle>{t('admin.sessions.confirmRevokeTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.sessions.confirmRevokeBody')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRevokeDialogId(null)}>{t('common.cancel')}</Button>
                    <Button
                        onClick={async () => {
                            if (revokeDialogId) await handleRevokeSession(revokeDialogId);
                            setRevokeDialogId(null);
                        }}
                        sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}
                    >
                        {t('admin.sessions.revoke')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SessionsPage;
