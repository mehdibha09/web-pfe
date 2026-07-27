import {
    Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, Stack, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
    assignRoleToUser,
    createUser,
    deleteUser,
    listRoles,
    listUserRoles,
    listUsers,
    listUsersPaginated,
    removeRoleFromUser,
    updateUser
} from '../../../services/adminService';
import { canDeleteUser, canManageUsers, canModifyUserStatus } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';

type UserItem = {
    id: string;
    fullName: string;
    email: string;
    status: 'ACTIVE' | 'INVITED' | 'DISABLED';
    roleName: string | null;
    roleId: string | null;
};

type RoleOption = {
    id: string;
    name: string;
};

const toUserItem = (user: any): UserItem => ({
    id: String(user.id),
    fullName: String(user.email || '-')
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase()),
    email: user.email || '-',
    status: (user.status || 'ACTIVE') as UserItem['status'],
    roleName: null,
    roleId: null
});

const UsersPage = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INVITED' | 'DISABLED'>('ACTIVE');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
    const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(getStoredUser());
    const [editStatusUserId, setEditStatusUserId] = useState<string | null>(null);
    const [newUserStatus, setNewUserStatus] = useState<'ACTIVE' | 'INVITED' | 'DISABLED'>('ACTIVE');

    const allowManageUsers = currentUser ? canManageUsers(currentUser) : false;
    const allowDeleteUser = currentUser ? canDeleteUser(currentUser) : false;
    const allowModifyUserStatus = currentUser ? canModifyUserStatus(currentUser) : false;

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const result = await listUsersPaginated(page, PAGE_SIZE);
            const baseUsers = result.items.map(toUserItem);

            const usersWithRoles = await Promise.all(
                baseUsers.map(async (user) => {
                    try {
                        const userRoles = await listUserRoles(user.id);
                        return {
                            ...user,
                            roleName: userRoles[0]?.name || null,
                            roleId: userRoles[0]?.id ? String(userRoles[0].id) : null
                        };
                    } catch {
                        return user;
                    }
                })
            );

            setUsers(usersWithRoles);
            setTotalElements(result.total);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToLoadUsers');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const loadRoles = async () => {
        try {
            const response = await listRoles();
            setAvailableRoles(
                response.map((role) => ({
                    id: String(role.id),
                    name: role.name || '-'
                }))
            );
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToLoadRoles');
            toast.error(message);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    useEffect(() => {
        loadUsers();
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

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch = search
                ? [user.fullName, user.email, user.status].join(' ').toLowerCase().includes(search.toLowerCase())
                : true;
            const matchesStatus = filterStatus ? user.status === filterStatus : true;
            return matchesSearch && matchesStatus;
        });
    }, [filterStatus, search, users]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const addUser = async () => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionCreate'));
            return;
        }

        if (!allowModifyUserStatus) {
            toast.error(t('admin.users.noPermissionSetStatus'));
            return;
        }

        if (!email.trim()) {
            toast.error(t('admin.users.emailRequired'));
            return;
        }

        if (!password.trim()) {
            toast.error(t('admin.users.passwordRequired'));
            return;
        }

        if (password.trim().length < 8) {
            toast.error(t('admin.users.passwordMinLength'));
            return;
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password.trim())) {
            toast.error(t('admin.users.passwordComplexity'));
            return;
        }

        try {
            await createUser({
                email: email.trim(),
                password: password.trim(),
                status
            });
            setEmail('');
            setPassword('');
            setStatus('ACTIVE');
            toast.success(t('admin.users.userCreated'));
            await loadUsers();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToCreateUser');
            toast.error(message);
        }
    };

    const handleAssignRole = async (userId: string) => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionManageRoles'));
            return;
        }

        const roleId = selectedRoleByUser[userId];
        if (!roleId) {
            toast.error(t('admin.users.selectRoleFirst'));
            return;
        }

        try {
            await assignRoleToUser(userId, roleId);
            toast.success(t('admin.users.roleAssigned'));
            await loadUsers();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToAssignRole');
            toast.error(message);
        }
    };

    const handleRemoveRole = async (userId: string, roleId: string) => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionManageRoles'));
            return;
        }

        try {
            await removeRoleFromUser(userId, roleId);
            toast.success(t('admin.users.roleRemoved'));
            await loadUsers();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToRemoveRole');
            toast.error(message);
        }
    };

    const handleUpdateUserStatus = async (userId: string) => {
        if (!allowModifyUserStatus) {
            toast.error(t('admin.users.noPermissionModifyStatus'));
            return;
        }

        try {
            await updateUser(userId, { status: newUserStatus });
            toast.success(t('admin.users.userStatusUpdated'));
            setEditStatusUserId(null);
            await loadUsers();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToUpdateUserStatus');
            toast.error(message);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!allowDeleteUser) {
            toast.error(t('admin.users.noPermissionDelete'));
            return;
        }

        try {
            await deleteUser(id);
            toast.success(t('admin.users.userDeleted'));
            await loadUsers();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.users.failedToDeleteUser');
            toast.error(message);
        }
    };

    const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.users.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.users.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {[{ label: t('admin.users.totalUsers'), value: totalElements, icon: <PeopleIcon />, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
                  { label: t('admin.users.visibleUsers'), value: filteredUsers.length, icon: <VisibilityIcon />, gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' },
                  { label: t('admin.users.activeUsers'), value: users.filter((u) => u.status === 'ACTIVE').length, icon: <PersonSearchIcon />, gradient: 'linear-gradient(135deg, #10B981, #34D399)' }
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

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
                {allowManageUsers && allowModifyUserStatus ? (
                    <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                        <CardContent sx={{ pt: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AddIcon sx={{ color: C.brand }} />
                                {t('admin.users.createUser')}
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 140px auto' }, gap: 2 }}>
                                <TextField
                                    label={t('common.email')}
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    size="small"
                                />
                                <TextField
                                    label={t('admin.users.temporaryPassword')}
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    size="small"
                                />
                                <TextField
                                    select
                                    label={t('common.status')}
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'INVITED' | 'DISABLED')}
                                    size="small"
                                >
                                    <MenuItem value="ACTIVE">{t('admin.users.active')}</MenuItem>
                                    <MenuItem value="INVITED">{t('admin.users.invited')}</MenuItem>
                                    <MenuItem value="DISABLED">{t('admin.users.disabled')}</MenuItem>
                                </TextField>
                                <Button onClick={addUser}>{t('common.create')}</Button>
                            </Box>
                        </CardContent>
                    </Card>
                ) : null}
                <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon sx={{ color: '#0EA5E9' }} />
                            {t('admin.users.filterUsers')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('common.search')}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('admin.users.searchPlaceholder')}
                                size="small"
                            />
                            <TextField
                                select
                                label={t('admin.users.statusFilter')}
                                value={filterStatus}
                                onChange={(event) => setFilterStatus(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.all')}</MenuItem>
                                <MenuItem value="ACTIVE">{t('admin.users.active')}</MenuItem>
                                <MenuItem value="INVITED">{t('admin.users.invited')}</MenuItem>
                                <MenuItem value="DISABLED">{t('admin.users.disabled')}</MenuItem>
                            </TextField>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filteredUsers.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <PeopleIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.users.noUsersFound')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('admin.users.tryAdjustingFilter')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {filteredUsers.map((user) => (
                        <Card
                            key={user.id}
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
                                    background: user.status === 'ACTIVE'
                                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                                        : user.status === 'INVITED'
                                            ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                                            : 'linear-gradient(90deg, #EF4444, #F87171)',
                                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                                }}
                            />
                            <CardContent sx={{ pt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                            {user.fullName}
                                        </Typography>
                                        <Typography sx={{ color: C.muted }}>{user.email}</Typography>
                                    </Box>
                                    {editStatusUserId === user.id ? (
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <TextField
                                                select
                                                size="small"
                                                value={newUserStatus}
                                                onChange={(event) =>
                                                    setNewUserStatus(event.target.value as 'ACTIVE' | 'INVITED' | 'DISABLED')
                                                }
                                                sx={{ width: 120 }}
                                            >
                                                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                                                <MenuItem value="INVITED">INVITED</MenuItem>
                                                <MenuItem value="DISABLED">DISABLED</MenuItem>
                                            </TextField>
                                            <Button onClick={() => handleUpdateUserStatus(user.id)} disabled={!allowModifyUserStatus}>
                                                {t('common.save')}
                                            </Button>
                                            <Button onClick={() => setEditStatusUserId(null)}>{t('common.cancel')}</Button>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip
                                                label={user.status}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    backgroundColor:
                                                        user.status === 'ACTIVE' ? '#E0F1E6'
                                                            : user.status === 'INVITED' ? '#F7ECD6'
                                                                : '#F7DEE3',
                                                    color:
                                                        user.status === 'ACTIVE' ? '#2E7A4F'
                                                            : user.status === 'INVITED' ? '#8A6A2E'
                                                                : '#A23B4E'
                                                }}
                                            />
                                            {allowModifyUserStatus && (
                                                <Button
                                                    onClick={() => {
                                                        setEditStatusUserId(user.id);
                                                        setNewUserStatus(user.status);
                                                    }}
                                                >
                                                    {t('common.edit')}
                                                </Button>
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.users.roles')}
                                        </Typography>
                                    </Box>
                                    {!user.roleName ? (
                                        <Typography variant="body2" sx={{ color: C.muted }}>
                                            {t('admin.users.noRoleAssigned')}
                                        </Typography>
                                    ) : (
                                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                                            <Chip
                                                label={user.roleName}
                                                onDelete={allowManageUsers && user.roleId ? () => handleRemoveRole(user.id, user.roleId as string) : undefined}
                                                size="small"
                                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                                            />
                                        </Stack>
                                    )}
                                </Box>

                                {allowManageUsers ? (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 1, mt: 2 }}>
                                        <TextField
                                            select
                                            size="small"
                                            label={t('admin.users.role')}
                                            value={selectedRoleByUser[user.id] || ''}
                                            onChange={(event) =>
                                                setSelectedRoleByUser((previous) => ({
                                                    ...previous,
                                                    [user.id]: event.target.value
                                                }))
                                            }
                                        >
                                            <MenuItem value="">{t('admin.users.selectRole')}</MenuItem>
                                            {availableRoles.map((role) => (
                                                <MenuItem key={role.id} value={role.id}>
                                                    {role.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <Button onClick={() => handleAssignRole(user.id)}>{t('admin.users.setRole')}</Button>
                                    </Box>
                                ) : null}
                            </CardContent>
                            {allowDeleteUser ? (
                                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                                    <Button
                                        onClick={() => setDeleteDialogId(user.id)}
                                        startIcon={<DeleteOutlineIcon />}
                                        variant="text"
                                        sx={{ color: '#DC2626', background: 'transparent', '&:hover': { background: 'rgba(220,38,38,0.08)' } }}
                                    >
                                        {t('common.delete')}
                                    </Button>
                                </CardActions>
                            ) : null}
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={deleteDialogId !== null} onClose={() => setDeleteDialogId(null)}>
                <DialogTitle>{t('admin.users.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.users.confirmDeleteBody')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogId(null)}>{t('common.cancel')}</Button>
                    <Button
                        onClick={async () => {
                            if (deleteDialogId) await handleDeleteUser(deleteDialogId);
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

export default UsersPage;
