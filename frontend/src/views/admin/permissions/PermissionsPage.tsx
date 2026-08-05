import {
    Alert, Box, Card, CardActions, CardContent, Chip, MenuItem, Stack, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/EditOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyIcon from '@mui/icons-material/VpnKey';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import ShieldIcon from '@mui/icons-material/Shield';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import { listPermissions, updatePermission } from '../../../services/adminService';
import { getStoredUser } from '../../../services/authStorage';
import { canManagePermissions, canManageUsers } from '../../../services/authorization';
import { C } from '../../../theme/tokens';

type PermissionItem = {
    id: string;
    key: string;
    action: string;
    resource: string;
    description: string;
};

const categories = [
    'AUTH',
    'USER',
    'ROLE',
    'PERMISSION',
    'TENANT',
    'SESSION',
    'AUDIT',
    'SERVICE',
    'ENVIRONMENT',
    'SERVICE_ENVIRONMENT',
    'DEPLOYMENT',
    'VM',
    'BACKUP',
    'K8S',
    'NOTIFICATION',
    'METRIC',
    'COST',
    'QUOTA',
    'ALERT',
    'GENERAL'
];

const parsePermission = (permission: any): PermissionItem => {
    const rawKey = String(permission.name || 'GENERAL_READ').trim();
    const parts = rawKey
        .toUpperCase()
        .split('_')
        .map((part: string) => part.trim())
        .filter(Boolean);

    const action = parts.length > 1 ? parts[parts.length - 1] : 'READ';
    const resource = parts.length > 1 ? parts.slice(0, -1).join('_') : 'GENERAL';

    return {
        id: String(permission.id),
        key: rawKey,
        action,
        resource,
        description: permission.description || ''
    };
};

const categoryOf = (resource: string): string => {
    const normalized = resource.trim().toUpperCase();
    if (categories.includes(normalized)) return normalized;
    const firstSegment = normalized.split('_')[0];
    return categories.includes(firstSegment) ? firstSegment : 'GENERAL';
};

const PermissionsPage = () => {
    const { t } = useTranslation();
    const [currentUser] = useState(getStoredUser());
    const allowEdit = canManagePermissions(currentUser!);
    const canReadDescriptions = canManageUsers(currentUser!);

    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterResource, setFilterResource] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const result = await listPermissions();
            setPermissions(result.map(parsePermission));
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToLoadPermissions');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    const actionOptions = useMemo(
        () => Array.from(new Set(permissions.map((permission) => permission.action))).sort(),
        [permissions]
    );

    const resourceOptions = useMemo(
        () => Array.from(new Set(permissions.map((permission) => permission.resource))).sort(),
        [permissions]
    );

    const filteredPermissions = useMemo(() => {
        return permissions.filter((permission) => {
            const query = search.trim().toLowerCase();
            const matchesSearch = query
                ? [permission.key, permission.action, permission.resource, permission.description]
                      .join(' ')
                      .toLowerCase()
                      .includes(query)
                : true;

            const matchesAction = filterAction ? permission.action === filterAction : true;
            const matchesResource = filterResource ? permission.resource === filterResource : true;
            const matchesCategory = filterCategory ? categoryOf(permission.resource) === filterCategory : true;

            return matchesSearch && matchesAction && matchesResource && matchesCategory;
        });
    }, [filterAction, filterCategory, filterResource, permissions, search]);

    useEffect(() => {
        setPage(0);
    }, [filterAction, filterCategory, filterResource, search]);

    const pageCount = Math.max(1, Math.ceil(filteredPermissions.length / PAGE_SIZE));
    const currentPageItems = filteredPermissions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const resetFilters = () => {
        setSearch('');
        setFilterAction('');
        setFilterResource('');
        setFilterCategory('');
    };

    const handleUpdatePermission = async (id: string) => {
        try {
            await updatePermission(id, {
                description: editDescription.trim() || undefined
            });
            toast.success(t('admin.permissions.permissionUpdated'));
            setEditingPermissionId(null);
            setEditDescription('');
            await loadPermissions();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToUpdatePermission');
            toast.error(message);
        }
    };

    const startEditPermission = (permission: PermissionItem) => {
        setEditingPermissionId(permission.id);
        setEditDescription(permission.description);
    };

    const cancelEditPermission = () => {
        setEditingPermissionId(null);
        setEditDescription('');
    };

    const actionGradient = (act: string) => {
        switch (act) {
            case 'CREATE': return 'linear-gradient(90deg, #3B82F6, #60A5FA)';
            case 'READ': return 'linear-gradient(90deg, #10B981, #34D399)';
            case 'UPDATE': return 'linear-gradient(90deg, #F59E0B, #FBBF24)';
            case 'DELETE': return 'linear-gradient(90deg, #EF4444, #F87171)';
            case 'MANAGE': return 'linear-gradient(90deg, #7C3AED, #A78BFA)';
            default: return 'linear-gradient(90deg, #6B7280, #9CA3AF)';
        }
    };

    const actionChipBg = (act: string) => {
        switch (act) {
            case 'CREATE': return '#DBEAFE';
            case 'READ': return '#D1FAE5';
            case 'UPDATE': return '#FEF3C7';
            case 'DELETE': return '#FEE2E2';
            case 'MANAGE': return '#EDE9FE';
            default: return '#F3F4F6';
        }
    };

    const actionChipColor = (act: string) => {
        switch (act) {
            case 'CREATE': return '#1D4ED8';
            case 'READ': return '#047857';
            case 'UPDATE': return '#92400E';
            case 'DELETE': return '#B91C1C';
            case 'MANAGE': return '#6D28D9';
            default: return '#4B5563';
        }
    };

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.permissions.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.permissions.subtitle')}
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                    {t('admin.permissions.helperText')}
                </Alert>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {[
                    { label: t('admin.permissions.totalPermissions'), value: permissions.length, icon: <ShieldIcon />, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
                    { label: t('admin.permissions.matchingFilters'), value: filteredPermissions.length, icon: <FilterListIcon />, gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' },
                    { label: t('admin.permissions.latestKey'), value: permissions[permissions.length - 1]?.key || '\u2014', icon: <KeyIcon />, gradient: 'linear-gradient(135deg, #10B981, #34D399)' }
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
                                {stat.label === t('admin.permissions.latestKey') ? (
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: C.text, mt: 0.5, wordBreak: 'break-all' }}>
                                        {stat.value}
                                    </Typography>
                                ) : (
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: C.text }}>
                                        {stat.value}
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', mb: 3 }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon sx={{ color: '#0EA5E9' }} />
                            {t('admin.permissions.filterPermissions')}
                        </Typography>
                        <Button
                            onClick={resetFilters}
                            startIcon={<RestartAltIcon />}
                            variant="text"
                            sx={{ background: 'transparent', '&:hover': { background: 'rgba(14,165,233,0.08)' } }}
                        >
                            {t('admin.permissions.resetFilters')}
                        </Button>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
                        <TextField
                            label={t('common.search')}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('admin.permissions.searchPlaceholder')}
                            size="small"
                        />
                        <TextField
                            select
                            label={t('admin.permissions.actionFilter')}
                            value={filterAction}
                            onChange={(event) => setFilterAction(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {actionOptions.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('admin.permissions.resourceFilter')}
                            value={filterResource}
                            onChange={(event) => setFilterResource(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {resourceOptions.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('admin.permissions.categoryFilter')}
                            value={filterCategory}
                            onChange={(event) => setFilterCategory(event.target.value)}
                            size="small"
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {categories.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </CardContent>
            </Card>

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filteredPermissions.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <ShieldIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.permissions.noPermissionsFound')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('admin.permissions.tryAdjustingFilter')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {currentPageItems.map((permission) => (
                        <Card
                            key={permission.id}
                            sx={{
                                borderRadius: 3,
                                position: 'relative',
                                overflow: 'visible',
                                height: '100%',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(124,58,237,0.1)' }
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                    background: actionGradient(permission.action),
                                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                                }}
                            />
                            <CardContent sx={{ pt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {editingPermissionId === permission.id ? (
                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, wordBreak: 'break-all' }}>
                                                    {permission.key}
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    label={t('admin.permissions.description')}
                                                    value={editDescription}
                                                    onChange={(event) => setEditDescription(event.target.value)}
                                                />
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                                                    <Button onClick={() => handleUpdatePermission(permission.id)}>{t('common.save')}</Button>
                                                    <Button onClick={cancelEditPermission}>{t('common.cancel')}</Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, wordBreak: 'break-all' }}>
                                                    {permission.key}
                                                </Typography>
                                                {canReadDescriptions && (
                                                    <Typography sx={{ color: C.muted }}>
                                                        {permission.description || '-'}
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                    {editingPermissionId !== permission.id && (
                                        <Chip
                                            label={permission.action || 'N/A'}
                                            size="small"
                                            sx={{
                                                backgroundColor: actionChipBg(permission.action),
                                                color: actionChipColor(permission.action),
                                                fontWeight: 700,
                                                flexShrink: 0
                                            }}
                                        />
                                    )}
                                </Box>

                                {editingPermissionId !== permission.id && (
                                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                                        <Chip
                                            label={permission.resource || '-'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 600, borderColor: C.border, color: '#475569' }}
                                        />
                                    </Stack>
                                )}
                            </CardContent>
                            {editingPermissionId !== permission.id && allowEdit && (
                                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                                    <Button onClick={() => startEditPermission(permission)} startIcon={<EditIcon />}>{t('common.edit')}</Button>
                                </CardActions>
                            )}
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={filteredPermissions.length} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}
        </Box>
    );
};

export default PermissionsPage;
