import {
    Box, Card, CardContent, Chip, MenuItem, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DescriptionIcon from '@mui/icons-material/Description';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import { listAuditActions, listAuditLogsPaginated, listAuditResources } from '../../../services/adminService';
import { C } from '../../../theme/tokens';

const fmtAuditDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

type AuditLogItem = {
    id: string;
    timestamp: string;
    action: string;
    resource: string;
    userId: string;
    userEmail: string;
    details: string;
};

const COMMON_RESOURCES = [
    'USER', 'ROLE', 'PERMISSION', 'TENANT', 'SESSION',
    'DEPLOYMENT', 'SERVICE', 'ENVIRONMENT', 'SERVICE_ENVIRONMENT',
    'VM', 'BACKUP', 'K8S', 'NAMESPACE',
    'METRIC', 'COST', 'QUOTA', 'ALERT', 'NOTIFICATION',
    'AUDIT', 'SSH', 'PRICE_CONFIG', 'FORECAST'
];

const AuditLogsPage = () => {
    const { t } = useTranslation();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [action, setAction] = useState('');
    const [resource, setResource] = useState('');
    const [userId, setUserId] = useState('');

    const [submittedFrom, setSubmittedFrom] = useState('');
    const [submittedTo, setSubmittedTo] = useState('');
    const [submittedAction, setSubmittedAction] = useState('');
    const [submittedResource, setSubmittedResource] = useState('');
    const [submittedUserId, setSubmittedUserId] = useState('');

    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [resources, setResources] = useState<string[]>([]);
    const [allActions, setAllActions] = useState<string[]>([]);
    const [userOptions, setUserOptions] = useState<{ id: string; email: string }[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    const loadLogs = async () => {
        setLoading(true);
        const response = await listAuditLogsPaginated(page - 1, PAGE_SIZE, {
            from: submittedFrom ? new Date(submittedFrom).toISOString() : undefined,
            to: submittedTo ? new Date(submittedTo).toISOString() : undefined,
            action: submittedAction || undefined,
            resource: submittedResource || undefined,
            userId: submittedUserId || undefined
        });

        const mapped = response.items.map((log) => ({
            id: String(log.id),
            timestamp: log.timestamp,
            action: log.action || '-',
            resource: log.resource || '-',
            userId: String(log.userId || ''),
            userEmail: log.userEmail || '-',
            details: log.details || '-'
        }));

        setLogs(mapped);
        setTotal(response.total);

        if (allActions.length === 0) {
            const actions = [...new Set(mapped.map((l) => l.action).filter(Boolean))].sort();
            setAllActions(actions);
        }

        const usersMap = new Map<string, { id: string; email: string }>();
        mapped.filter((l) => l.userId).forEach((l) => {
            if (l.userId) usersMap.set(l.userId, { id: l.userId, email: l.userEmail || '' });
        });
        const users = [...usersMap.values()];
        setUserOptions((prev) => {
            const merged = new Map(prev.map((u) => [u.id, u]));
            users.forEach((u) => merged.set(u.id, u));
            return [...merged.values()];
        });

        setLoading(false);
    };

    useEffect(() => {
        loadLogs();
    }, [submittedAction, submittedFrom, submittedResource, submittedTo, submittedUserId, page]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [resourcesResponse, actionsResponse] = await Promise.all([
                    listAuditResources(),
                    listAuditActions()
                ]);
                setResources(resourcesResponse);
                const actions = [...new Set(actionsResponse.map((a) => a.toUpperCase()).filter(Boolean))].sort();
                setAllActions(actions);
            } catch {
                // silently fail
            }
        };
        loadInitialData();
    }, []);

    const mergedResources = useMemo(() => {
        const set = new Set([...COMMON_RESOURCES, ...resources.map((r) => r.toUpperCase())]);
        return [...set].sort();
    }, [resources]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const applyFilter = () => {
        setPage(1);
        setSubmittedFrom(from.trim());
        setSubmittedTo(to.trim());
        setSubmittedAction(action.trim());
        setSubmittedResource(resource.trim());
        setSubmittedUserId(userId.trim());
    };

    const clearFilter = () => {
        setPage(1);
        setFrom('');
        setTo('');
        setAction('');
        setResource('');
        setUserId('');
        setSubmittedFrom('');
        setSubmittedTo('');
        setSubmittedAction('');
        setSubmittedResource('');
        setSubmittedUserId('');
    };

    const actionColor = (act: string) => {
        const upper = act.toUpperCase();
        if (upper.includes('CREATE') || upper.includes('ADD')) return { bg: '#D1FAE5', color: '#047857' };
        if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE')) return { bg: '#FEE2E2', color: '#B91C1C' };
        if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('MODIFY')) return { bg: '#FEF3C7', color: '#92400E' };
        if (upper.includes('LOGIN') || upper.includes('LOGOUT')) return { bg: '#DBEAFE', color: '#1D4ED8' };
        return { bg: '#F3F4F6', color: '#4B5563' };
    };

    const actionGradient = (act: string) => {
        const upper = act.toUpperCase();
        if (upper.includes('CREATE') || upper.includes('ADD')) return 'linear-gradient(90deg, #10B981, #34D399)';
        if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE')) return 'linear-gradient(90deg, #EF4444, #F87171)';
        if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('MODIFY')) return 'linear-gradient(90deg, #F59E0B, #FBBF24)';
        if (upper.includes('LOGIN') || upper.includes('LOGOUT')) return 'linear-gradient(90deg, #3B82F6, #60A5FA)';
        return 'linear-gradient(90deg, #6B7280, #9CA3AF)';
    };

    const selectedUserEmail = userOptions.find((u) => u.id === userId)?.email || '';

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.auditLogs.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.auditLogs.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {[
                    { label: t('admin.auditLogs.totalLogs'), value: logs.length, icon: <DescriptionIcon />, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
                    { label: t('admin.auditLogs.visibleLogs'), value: logs.length, icon: <VisibilityIcon />, gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' },
                    { label: t('admin.auditLogs.uniqueActions'), value: new Set(logs.map((l) => l.action)).size, icon: <TrackChangesIcon />, gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }
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
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EC4899, #F472B6)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent sx={{ pt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterListIcon sx={{ color: '#EC4899' }} />
                        {t('admin.auditLogs.filterLogs')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr) auto auto' }, gap: 2 }}>
                        <TextField
                            label={t('admin.auditLogs.from')}
                            type="datetime-local"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': { borderColor: '#EC4899' }
                                },
                                '& label.Mui-focused': { color: '#EC4899' }
                            }}
                        />
                        <TextField
                            label={t('admin.auditLogs.to')}
                            type="datetime-local"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={to}
                            onChange={(event) => setTo(event.target.value)}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': { borderColor: '#EC4899' }
                                },
                                '& label.Mui-focused': { color: '#EC4899' }
                            }}
                        />
                        <TextField
                            select
                            label={t('admin.auditLogs.action')}
                            value={action}
                            onChange={(event) => setAction(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {allActions.map((actionItem) => (
                                <MenuItem key={actionItem} value={actionItem}>
                                    {actionItem}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('admin.auditLogs.resource')}
                            value={resource}
                            onChange={(event) => setResource(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {mergedResources.map((resourceItem) => (
                                <MenuItem key={resourceItem} value={resourceItem}>
                                    {resourceItem}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('admin.auditLogs.userId')}
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {userOptions.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.email || u.id}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button onClick={applyFilter} startIcon={<SearchIcon />}>{t('common.filter')}</Button>
                        <Button onClick={clearFilter} variant="text" sx={{ color: C.muted, background: 'transparent', '&:hover': { background: 'rgba(0,0,0,0.05)' } }}>{t('common.clear')}</Button>
                    </Box>
                </CardContent>
            </Card>

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : logs.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <SearchIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.auditLogs.noLogsFound')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('admin.auditLogs.tryAdjustingFilter')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {logs.map((log) => {
                        const ac = actionColor(log.action);
                        return (
                            <Card
                                key={log.id}
                                sx={{
                                    borderRadius: 3,
                                    position: 'relative',
                                    overflow: 'visible',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(124,58,237,0.1)' }
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                        background: actionGradient(log.action),
                                        borderTopLeftRadius: 12, borderTopRightRadius: 12
                                    }}
                                />
                                <CardContent sx={{ pt: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                                {log.action}
                                            </Typography>
                                            <Typography sx={{ color: C.muted }}>{log.resource}</Typography>
                                        </Box>
                                        {log.userEmail && log.userEmail !== '-' && (
                                            <Chip
                                                icon={<PersonIcon sx={{ fontSize: 12 }} />}
                                                label={log.userEmail}
                                                size="small"
                                                sx={{ backgroundColor: ac.bg, color: ac.color, fontWeight: 600, flexShrink: 0, fontSize: 11 }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                                {t('admin.auditLogs.timestamp')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: C.text, fontFamily: 'monospace', fontSize: 12 }}>
                                                {fmtAuditDate(log.timestamp)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                                        {log.details}
                                    </Typography>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
                <PaginationBar page={page} pageCount={totalPages} total={total} onPageChange={setPage} />
                </>
            )}
        </Box>
    );
};

export default AuditLogsPage;