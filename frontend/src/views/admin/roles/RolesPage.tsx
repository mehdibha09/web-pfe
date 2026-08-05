import {
    Alert, Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, Divider, MenuItem, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
    addPermissionToRole,
    createRole,
    deleteRole,
    listPermissions,
    listRoles,
    listRolesPaginated,
    removePermissionFromRole,
    updateRole
} from '../../../services/adminService';
import { canDeleteRole, isSuperAdmin } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';

type RoleItem = {
    id: string;
    name: string;
    description: string;
    permissions: string[];
};

type PermissionItem = {
    id: string;
    name: string;
    description: string;
};

const RolesPage = () => {
    const { t } = useTranslation();
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [filterPermission, setFilterPermission] = useState('');
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [currentUser, setCurrentUser] = useState(getStoredUser());
    const [selectedRoleForPermission, setSelectedRoleForPermission] = useState<string | null>(null);
    const [selectedPermission, setSelectedPermission] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const allowDeleteRole = currentUser ? canDeleteRole(currentUser) : false;

    const currentUserIsSuperAdmin = currentUser ? isSuperAdmin(currentUser) : false;

    const isSuperAdminRole = (role: RoleItem) =>
        ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes((role.name || '').trim().toUpperCase().replace(/[\s-]+/g, '_'));

    const isAdminRole = (role: RoleItem) =>
        (role.name || '').trim().toUpperCase().replace(/[\s-]+/g, '_') === 'ADMIN';

    const isProtectedRole = (role: RoleItem) => isSuperAdminRole(role) || (isAdminRole(role) && !currentUserIsSuperAdmin);

    const permColor = (name: string) => {
        if (name.startsWith('USER')) return { bg: '#E0F1E6', fg: '#2E7A4F' };
        if (name.startsWith('ROLE') || name.startsWith('PERMISSION')) return { bg: '#E4EEF7', fg: '#2E5C8A' };
        if (name.startsWith('TENANT')) return { bg: '#F5F3FF', fg: '#5E4B9E' };
        if (name.startsWith('SESSION') || name.startsWith('AUDIT')) return { bg: '#FFF7ED', fg: '#8A6A2E' };
        if (name.startsWith('SERVICE') || name.startsWith('DEPLOYMENT')) return { bg: '#FDF4FF', fg: '#5E4B9E' };
        if (name.startsWith('VM') || name.startsWith('K8S')) return { bg: '#E6F5F5', fg: '#0D7C7C' };
        return { bg: '#F3F4F6', fg: '#6B7280' };
    };

    const loadRoles = async () => {
        setLoading(true);
        try {
            const result = await listRolesPaginated(page, PAGE_SIZE);
            const mapped = result.items.map((role) => ({
                id: String(role.id),
                name: role.name || '-',
                description: role.description || '',
                permissions: role.permissions || [],
            }));
            setRoles(mapped);
            setTotalElements(result.total);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToLoadRoles');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    useEffect(() => {
        loadRoles();
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

    const loadPermissions = async () => {
        try {
            const response = await listPermissions();
            setPermissions(
                response.map((permission) => ({
                    id: String(permission.id),
                    name: permission.name || '-',
                    description: permission.description || ''
                }))
            );
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToLoadPermissions');
            toast.error(message);
        }
    };

    const filteredRoles = useMemo(() => {
        return roles.filter((role) => {
            const matchesSearch = search
                ? [role.name, role.description, role.permissions.join(' ')]
                      .join(' ')
                      .toLowerCase()
                      .includes(search.toLowerCase())
                : true;

            const matchesPermission = filterPermission
                ? role.permissions.join(' ').toLowerCase().includes(filterPermission.toLowerCase())
                : true;

            return matchesSearch && matchesPermission;
        });
    }, [filterPermission, roles, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleCreateRole = async () => {
        if (!roleName.trim()) {
            toast.error(t('admin.roles.roleNameRequired'));
            return;
        }
        try {
            await createRole({
                name: roleName.trim(),
                description: description.trim(),
                permissions: selectedPermissions
            });
            setRoleName('');
            setDescription('');
            setSelectedPermissions([]);
            toast.success(t('admin.roles.roleCreated'));
            await loadRoles();
        } catch (error: any) {
            const serverMsg = error?.response?.data?.message || '';
            const enToFr: Record<string, string> = {
                'Role already exists for this tenant': t('admin.roles.roleAlreadyExists'),
            };
            const message = enToFr[serverMsg] || serverMsg || error?.message || t('admin.roles.failedToCreateRole');
            toast.error(message);
        }
    };

    const handleRemoveRole = async () => {
        if (!confirmDeleteId) return;
        const target = roles.find((r) => r.id === confirmDeleteId);
        if (target && isProtectedRole(target)) {
            toast.error(t('admin.roles.protectedRoleError'));
            setConfirmDeleteId(null);
            return;
        }
        try {
            await deleteRole(confirmDeleteId);
            toast.success(t('admin.roles.roleDeleted'));
            setConfirmDeleteId(null);
            await loadRoles();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToDeleteRole');
            toast.error(message);
        }
    };

    const startEditRole = (role: RoleItem) => {
        setEditingRoleId(role.id);
        setEditingName(role.name);
        setEditingDescription(role.description || '');
    };

    const cancelEditRole = () => {
        setEditingRoleId(null);
        setEditingName('');
        setEditingDescription('');
    };

    const handleUpdateRole = async (id: string) => {
        const target = roles.find((r) => r.id === id);
        if (target && isProtectedRole(target)) {
            toast.error(t('admin.roles.protectedRoleError'));
            cancelEditRole();
            return;
        }
        if (!editingName.trim()) {
            toast.error(t('admin.roles.roleNameRequired'));
            return;
        }
        try {
            await updateRole(id, {
                name: editingName.trim(),
                description: editingDescription.trim()
            });
            toast.success(t('admin.roles.roleUpdated'));
            cancelEditRole();
            await loadRoles();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToUpdateRole');
            toast.error(message);
        }
    };

    const handleAddPermission = async (roleId: string) => {
        const target = roles.find((r) => r.id === roleId);
        if (target && isProtectedRole(target)) {
            toast.error(t('admin.roles.protectedRoleError'));
            return;
        }
        if (!selectedPermission) {
            toast.error(t('admin.roles.selectPermissionFirst'));
            return;
        }
        const permission = permissions.find((item) => item.id === selectedPermission);
        if (!permission) {
            toast.error(t('admin.roles.permissionNotFound'));
            return;
        }
        try {
            await addPermissionToRole(roleId, {
                permissionId: selectedPermission,
                permissionName: permission.name,
                description: permission.description
            });
            toast.success(t('admin.roles.permissionAddedToRole'));
            setSelectedRoleForPermission(null);
            setSelectedPermission('');
            await loadRoles();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToAddPermission');
            toast.error(message);
        }
    };

    const handleRemovePermission = async (roleId: string, permissionName: string) => {
        const target = roles.find((r) => r.id === roleId);
        if (target && isProtectedRole(target)) {
            toast.error(t('admin.roles.protectedRoleError'));
            return;
        }
        const permission = permissions.find((item) => item.name === permissionName);
        if (!permission) {
            toast.error(t('admin.roles.permissionIdentifierNotFound'));
            return;
        }
        try {
            await removePermissionFromRole(roleId, permission.id);
            toast.success(t('admin.roles.permissionRemovedFromRole'));
            await loadRoles();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.roles.failedToRemovePermission');
            toast.error(message);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(160deg, #FAF8FF 0%, #F5F0FA 50%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Box sx={{ width: 3, height: 28, borderRadius: 2, backgroundColor: C.brand }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
                        {t('admin.roles.title')}
                    </Typography>
                </Box>
                <Typography sx={{ color: C.muted, ml: 4.5 }}>
                    {t('admin.roles.subtitle')}
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' }, ml: 4.5 }}>
                    {t('admin.roles.helperText')}
                </Alert>
                {roles.some(isProtectedRole) && (
                    <Alert severity="warning" sx={{ mt: 1, borderRadius: 2, ml: 4.5, bgcolor: '#FFF8E1', '& .MuiAlert-icon': { color: '#B26A00' } }}>
                        {t('admin.roles.superAdminRoleNote')}
                    </Alert>
                )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8FA 100%)', boxShadow: '0 2px 12px rgba(157,78,221,0.08)' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: `linear-gradient(135deg, ${C.brandLight} 0%, #F0E6FF 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <VpnKeyIcon sx={{ color: C.brand, fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography variant="overline" sx={{ color: C.muted, fontSize: 10, letterSpacing: '0.08em' }}>
                                {t('admin.roles.totalRoles')}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, lineHeight: 1.1, fontSize: 28 }}>
                                {totalElements}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)', boxShadow: '0 2px 12px rgba(46,92,138,0.08)' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 46, height: 46, borderRadius: 2.5, background: 'linear-gradient(135deg, #E4EEF7 0%, #D6E4F0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FilterListIcon sx={{ color: '#2E5C8A', fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography variant="overline" sx={{ color: C.muted, fontSize: 10, letterSpacing: '0.08em' }}>
                                {t('admin.roles.matchingRoles')}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: C.text, lineHeight: 1.1, fontSize: 28 }}>
                                {filteredRoles.length}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AddIcon sx={{ fontSize: 16, color: C.brand }} />
                            {t('admin.roles.createRole')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 1.5 }}>
                            <TextField
                                size="small"
                                label={t('admin.roles.roleName')}
                                value={roleName}
                                onChange={(event) => setRoleName(event.target.value)}
                            />
                            <Button onClick={handleCreateRole} sx={{ height: 40, whiteSpace: 'nowrap' }}>{t('common.create')}</Button>
                        </Box>
                        <TextField
                            size="small"
                            label={t('admin.roles.description')}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            sx={{ mt: 1.5, width: '100%' }}
                        />
                        <TextField
                            select
                            size="small"
                            label={t('admin.roles.selectPermissions')}
                            value={selectedPermissions}
                            onChange={(event) => setSelectedPermissions((event.target.value as unknown) as string[])}
                            slotProps={{ select: { multiple: true } }}
                            sx={{ mt: 1.5, width: '100%' }}
                        >
                            {permissions.map((perm) => (
                                <MenuItem key={perm.id} value={perm.name}>
                                    {perm.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2E5C8A, #5E4B9E)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon sx={{ fontSize: 16, color: '#2E5C8A' }} />
                            {t('admin.roles.filterRoles')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                            <TextField
                                size="small"
                                label={t('common.search')}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('admin.roles.searchPlaceholder')}
                            />
                            <TextField
                                select
                                size="small"
                                label={t('admin.roles.permissionFilter')}
                                value={filterPermission}
                                onChange={(event) => setFilterPermission(event.target.value)}
                            >
                                <MenuItem value="">{t('admin.roles.allPermissions')}</MenuItem>
                                {permissions.map((perm) => (
                                    <MenuItem key={perm.id} value={perm.name}>{perm.name}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {loading ? (
                <LoadingSpinner variant="page" />
            ) : filteredRoles.length === 0 ? (
                <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, background: '#FFFFFF' }}>
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <SecurityIcon sx={{ fontSize: 30, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.roles.noRolesFound')}
                        </Typography>
                        <Typography sx={{ color: C.subtle, fontSize: 13 }}>
                            {filterPermission ? t('admin.roles.tryAdjustingFilter') : ''}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {filteredRoles.map((role) => (
                        <Card
                            key={role.id}
                            sx={{
                                borderRadius: 3,
                                border: `1px solid ${C.border}`,
                                background: '#FFFFFF',
                                position: 'relative',
                                overflow: 'visible',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                transition: 'box-shadow 0.25s, transform 0.25s',
                                '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.07)', transform: 'translateY(-2px)' }
                            }}
                        >
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brandLight}, ${C.brand})`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                            <CardContent sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {editingRoleId === role.id ? (
                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                <TextField
                                                    size="small"
                                                    label={t('admin.roles.roleName')}
                                                    value={editingName}
                                                    onChange={(event) => setEditingName(event.target.value)}
                                                />
                                                <TextField
                                                    size="small"
                                                    label={t('admin.roles.description')}
                                                    value={editingDescription}
                                                    onChange={(event) => setEditingDescription(event.target.value)}
                                                />
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.3 }}>
                                                    {role.name}
                                                </Typography>
                                                <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {role.description || '—'}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                    <Chip
                                        label={t('admin.roles.permissionsCount', { count: role.permissions.length })}
                                        size="small"
                                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 800, fontSize: 10, height: 22, flexShrink: 0 }}
                                    />
                                </Box>
                                <Divider sx={{ mb: 1.5, borderColor: C.border }} />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minHeight: 26, maxHeight: 72, overflowY: 'auto', pr: 0.5, alignContent: 'flex-start' }}>
                                    {role.permissions.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: C.subtle, fontSize: 12, py: 0.25 }}>
                                            {t('admin.roles.noPermissionsAssigned')}
                                        </Typography>
                                    ) : (
                                        role.permissions.map((permission) => {
                                            const pc = permColor(permission);
                                            return (
                                                <Chip
                                                    key={permission}
                                                    label={permission}
                                                    onDelete={isProtectedRole(role) ? undefined : () => handleRemovePermission(role.id, permission)}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: pc.bg, color: pc.fg,
                                                        fontWeight: 700, fontSize: 10, height: 22,
                                                        '& .MuiChip-deleteIcon': { fontSize: 13, color: pc.fg, opacity: 0.7, '&:hover': { opacity: 1 } }
                                                    }}
                                                />
                                            );
                                        })
                                    )}
                                </Box>
                                {!isProtectedRole(role) && selectedRoleForPermission === role.id && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: C.muted, display: 'block', mb: 1 }}>
                                            {t('admin.roles.availablePermissions')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                            {permissions.filter((perm) => !role.permissions.includes(perm.name)).length === 0 ? (
                                                <Typography variant="body2" sx={{ color: C.subtle, py: 0.5 }}>{t('admin.roles.noMorePermissions')}</Typography>
                                            ) : (
                                                permissions
                                                    .filter((perm) => !role.permissions.includes(perm.name))
                                                    .map((permission) => {
                                                        const pc = permColor(permission.name);
                                                        return (
                                                            <Chip
                                                                key={permission.id}
                                                                label={permission.name}
                                                                onClick={() => {
                                                                    setSelectedPermission(permission.id);
                                                                    setTimeout(() => handleAddPermission(role.id), 0);
                                                                }}
                                                                size="small"
                                                                clickable
                                                                sx={{
                                                                    backgroundColor: pc.bg, color: pc.fg,
                                                                    fontWeight: 600, fontSize: 10, height: 24,
                                                                    cursor: 'pointer',
                                                                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            />
                                                        );
                                                    })
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                            <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 0.5, borderTop: `1px solid ${C.border}`, pt: 1.5 }}>
                                {isProtectedRole(role) ? (
                                    <Typography variant="caption" sx={{ color: C.muted, ml: 'auto' }}>
                                        {t('admin.roles.protectedRoleHint')}
                                    </Typography>
                                ) : editingRoleId === role.id ? (
                                    <>
                                        <Button onClick={cancelEditRole} size="small">{t('common.cancel')}</Button>
                                        <Button onClick={() => handleUpdateRole(role.id)} size="small">{t('common.save')}</Button>
                                    </>
                                ) : (
                                    <Button onClick={() => startEditRole(role)} size="small" startIcon={<EditOutlinedIcon />}>{t('common.edit')}</Button>
                                )}
                                {selectedRoleForPermission === role.id ? (
                                    <Button onClick={() => setSelectedRoleForPermission(null)} size="small">{t('common.cancel')}</Button>
                                ) : (
                                    !isProtectedRole(role) && (
                                        <Button onClick={() => setSelectedRoleForPermission(role.id)} size="small">
                                            {t('admin.roles.addPermission')}
                                        </Button>
                                    )
                                )}
                                {allowDeleteRole && !isProtectedRole(role) && editingRoleId !== role.id && selectedRoleForPermission !== role.id && (
                                    <Button onClick={() => setConfirmDeleteId(role.id)} size="small" startIcon={<DeleteOutlinedIcon />} variant="text" sx={{ color: '#DC2626', background: 'transparent', '&:hover': { background: 'rgba(220,38,38,0.08)' } }}>{t('common.delete')}</Button>
                                )}
                            </CardActions>
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>{t('admin.roles.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: C.muted }}>{t('admin.roles.confirmDeleteBody')}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                    <Button onClick={handleRemoveRole} sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RolesPage;
