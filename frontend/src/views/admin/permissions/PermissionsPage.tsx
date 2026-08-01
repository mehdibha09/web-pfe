import {
    Alert, Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, Stack, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyIcon from '@mui/icons-material/VpnKey';
import SearchIcon from '@mui/icons-material/Search';
import ShieldIcon from '@mui/icons-material/Shield';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import { createPermission, deletePermission, listPermissions, listPermissionsPaginated, updatePermission } from '../../../services/adminService';
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

const PermissionsPage = () => {
    const { t } = useTranslation();
    const [permissionKey, setPermissionKey] = useState('');
    const [action, setAction] = useState('');
    const [resource, setResource] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');

    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterResource, setFilterResource] = useState('');


    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const result = await listPermissionsPaginated(page, PAGE_SIZE);
            setPermissions(result.items.map(parsePermission));
            setTotalElements(result.total);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToLoadPermissions');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPermissions();
    }, [page]);

    useEffect(() => {
        if (page >= pageCount && page > 0) setPage(pageCount - 1);
    }, [totalElements]);

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

            return matchesSearch && matchesAction && matchesResource;
        });
    }, [filterAction, filterResource, permissions, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleCreatePermission = async () => {
        if (!permissionKey.trim()) {
            toast.error(t('admin.permissions.permissionKeyRequired'));
            return;
        }

        const finalAction = action.trim() || 'READ';
        const finalResource = resource.trim() || 'GENERAL';
        const generatedName = permissionKey.trim() || `${finalAction}_${finalResource}`;
        const generatedDescription =
            description.trim() || `${finalAction} access on ${finalResource} (${category || 'AUTH'})`;

        try {
            await createPermission({
                name: generatedName,
                description: generatedDescription
            });

            setPermissionKey('');
            setAction('');
            setResource('');
            setCategory('');
            setDescription('');
            toast.success(t('admin.permissions.permissionCreated'));
            await loadPermissions();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToCreatePermission');
            toast.error(message);
        }
    };

    const handleUpdatePermission = async (id: string) => {
        if (!editName.trim()) {
            toast.error(t('admin.permissions.permissionNameRequired'));
            return;
        }

        try {
            await updatePermission(id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined
            });
            toast.success(t('admin.permissions.permissionUpdated'));
            setEditingPermissionId(null);
            setEditName('');
            setEditDescription('');
            await loadPermissions();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToUpdatePermission');
            toast.error(message);
        }
    };

    const startEditPermission = (permission: PermissionItem) => {
        setEditingPermissionId(permission.id);
        setEditName(permission.key);
        setEditDescription(permission.description);
    };

    const cancelEditPermission = () => {
        setEditingPermissionId(null);
        setEditName('');
        setEditDescription('');
    };

    const handleRemovePermission = async (id: string) => {
        try {
            await deletePermission(id);
            toast.success(t('admin.permissions.permissionDeleted'));
            await loadPermissions();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.permissions.failedToDeletePermission');
            toast.error(message);
        }
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
                    { label: t('admin.permissions.totalPermissions'), value: totalElements, icon: <ShieldIcon />, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
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

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AddIcon sx={{ color: C.brand }} />
                            {t('admin.permissions.createPermission')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                            <TextField
                                label={t('admin.permissions.permissionKey')}
                                value={permissionKey}
                                onChange={(event) => setPermissionKey(event.target.value)}
                                size="small"
                            />
                            <TextField
                                select
                                label={t('admin.permissions.action')}
                                value={action}
                                onChange={(event) => setAction(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.select')}</MenuItem>
                                <MenuItem value="CREATE">{t('admin.permissions.create')}</MenuItem>
                                <MenuItem value="READ">{t('admin.permissions.read')}</MenuItem>
                                <MenuItem value="UPDATE">{t('admin.permissions.update')}</MenuItem>
                                <MenuItem value="DELETE">{t('admin.permissions.delete')}</MenuItem>
                                <MenuItem value="MANAGE">{t('admin.permissions.manage')}</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label={t('admin.permissions.resource')}
                                value={resource}
                                onChange={(event) => setResource(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.select')}</MenuItem>
                                <MenuItem value="USER">{t('admin.permissions.user')}</MenuItem>
                                <MenuItem value="ROLE">{t('admin.permissions.role')}</MenuItem>
                                <MenuItem value="PERMISSION">{t('admin.permissions.permission')}</MenuItem>
                                <MenuItem value="TENANT">{t('admin.permissions.tenant')}</MenuItem>
                                <MenuItem value="SESSION">{t('admin.permissions.session')}</MenuItem>
                                <MenuItem value="AUDIT">{t('admin.permissions.audit')}</MenuItem>
                                <MenuItem value="SERVICE">{t('admin.permissions.service')}</MenuItem>
                                <MenuItem value="ENVIRONMENT">{t('admin.permissions.environment')}</MenuItem>
                                <MenuItem value="DEPLOYMENT">{t('admin.permissions.deployment')}</MenuItem>
                                <MenuItem value="VM">{t('admin.permissions.vm')}</MenuItem>
                                <MenuItem value="BACKUP">{t('admin.permissions.backup')}</MenuItem>
                                <MenuItem value="K8S">{t('admin.permissions.k8s')}</MenuItem>
                                <MenuItem value="NOTIFICATION">{t('admin.permissions.notification')}</MenuItem>
                                <MenuItem value="METRIC">{t('admin.permissions.metric')}</MenuItem>
                                <MenuItem value="COST">{t('admin.permissions.cost')}</MenuItem>
                                <MenuItem value="QUOTA">{t('admin.permissions.quota')}</MenuItem>
                                <MenuItem value="ALERT">{t('admin.permissions.alert')}</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label={t('admin.permissions.category')}
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.select')}</MenuItem>
                                {categories.map((item) => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label={t('admin.permissions.description')}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                size="small"
                                sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}
                            />
                            <Box sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' }, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCreatePermission} startIcon={<AddIcon />}>{t('common.create')}</Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon sx={{ color: '#0EA5E9' }} />
                            {t('admin.permissions.filterPermissions')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('common.search')}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('admin.permissions.searchPlaceholder')}
                                size="small"
                                sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}
                            />
                            <TextField
                                select
                                label={t('admin.permissions.actionFilter')}
                                value={filterAction}
                                onChange={(event) => setFilterAction(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.all')}</MenuItem>
                                <MenuItem value="CREATE">{t('admin.permissions.create')}</MenuItem>
                                <MenuItem value="READ">{t('admin.permissions.read')}</MenuItem>
                                <MenuItem value="UPDATE">{t('admin.permissions.update')}</MenuItem>
                                <MenuItem value="DELETE">{t('admin.permissions.delete')}</MenuItem>
                                <MenuItem value="MANAGE">{t('admin.permissions.manage')}</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label={t('admin.permissions.resourceFilter')}
                                value={filterResource}
                                onChange={(event) => setFilterResource(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.all')}</MenuItem>
                                <MenuItem value="USER">{t('admin.permissions.user')}</MenuItem>
                                <MenuItem value="ROLE">{t('admin.permissions.role')}</MenuItem>
                                <MenuItem value="PERMISSION">{t('admin.permissions.permission')}</MenuItem>
                                <MenuItem value="TENANT">{t('admin.permissions.tenant')}</MenuItem>
                                <MenuItem value="SESSION">{t('admin.permissions.session')}</MenuItem>
                                <MenuItem value="AUDIT">{t('admin.permissions.audit')}</MenuItem>
                                <MenuItem value="SERVICE">{t('admin.permissions.service')}</MenuItem>
                                <MenuItem value="ENVIRONMENT">{t('admin.permissions.environment')}</MenuItem>
                                <MenuItem value="DEPLOYMENT">{t('admin.permissions.deployment')}</MenuItem>
                                <MenuItem value="VM">{t('admin.permissions.vm')}</MenuItem>
                                <MenuItem value="BACKUP">{t('admin.permissions.backup')}</MenuItem>
                                <MenuItem value="K8S">{t('admin.permissions.k8s')}</MenuItem>
                                <MenuItem value="NOTIFICATION">{t('admin.permissions.notification')}</MenuItem>
                                <MenuItem value="METRIC">{t('admin.permissions.metric')}</MenuItem>
                                <MenuItem value="COST">{t('admin.permissions.cost')}</MenuItem>
                                <MenuItem value="QUOTA">{t('admin.permissions.quota')}</MenuItem>
                                <MenuItem value="ALERT">{t('admin.permissions.alert')}</MenuItem>
                                <MenuItem value="GENERAL">{t('admin.permissions.general')}</MenuItem>
                            </TextField>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

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
                    {filteredPermissions.map((permission) => (
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
                                                <TextField
                                                    size="small"
                                                    label={t('admin.permissions.permissionName')}
                                                    value={editName}
                                                    onChange={(event) => setEditName(event.target.value)}
                                                />
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
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                                    {permission.key}
                                                </Typography>
                                                <Typography sx={{ color: C.muted }}>
                                                    {permission.description || '-'}
                                                </Typography>
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
                            {editingPermissionId !== permission.id && (
                                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                                    <Button onClick={() => startEditPermission(permission)} startIcon={<EditIcon />}>{t('common.edit')}</Button>
                                    <Button onClick={() => setDeleteDialogId(permission.id)} startIcon={<DeleteOutlineIcon />} variant="text" sx={{ color: '#DC2626', background: 'transparent', '&:hover': { background: 'rgba(220,38,38,0.08)' } }}>{t('common.delete')}</Button>
                                </CardActions>
                            )}
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={deleteDialogId !== null} onClose={() => setDeleteDialogId(null)}>
                <DialogTitle>{t('admin.permissions.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.permissions.confirmDeleteBody')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogId(null)}>{t('common.cancel')}</Button>
                    <Button
                        onClick={async () => {
                            if (deleteDialogId) await handleRemovePermission(deleteDialogId);
                            setDeleteDialogId(null);
                        }}
                        sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}
                    >
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PermissionsPage;
