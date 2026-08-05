import {
    Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, Stack, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
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
import { canDeleteUser, canManageUsers, canModifyUserStatus, isAdminRoleName, isSuperAdmin } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { useInlineErrors } from '../../../hooks/useInlineErrors';

type UserItem = {
    id: string;
    fullName: string;
    email: string;
    status: 'ACTIVE' | 'INVITED' | 'DISABLED';
    roleName: string | null;
    roleId: string | null;
    tenantId: string;
    tenantName: string;
};

type RoleOption = {
    id: string;
    name: string;
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'admin.users.active',
    INVITED: 'admin.users.invited',
    DISABLED: 'admin.users.disabled'
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
    roleId: null,
    tenantId: user.tenantId || '',
    tenantName: user.tenantName || ''
});

const mapServerMessage = (message: string, t: (key: string, options?: any) => string): string => {
    const map: Record<string, string> = {
        'Email already exists': 'admin.users.emailAlreadyExists',
        'User email already exists in this tenant': 'admin.users.emailAlreadyExistsInTenant',
        'User already assigned to role': 'admin.users.userAlreadyAssignedToRole',
        'Only a super administrator can modify an administrator account': 'admin.users.cannotModifyAdminUser'
    };
    return map[message] ? t(map[message]) : '';
};

const UsersPage = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INVITED' | 'DISABLED'>('ACTIVE');
    const [selectedRole, setSelectedRole] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
    const [defaultViewerRoleId, setDefaultViewerRoleId] = useState('');
    const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(getStoredUser());
    const [editStatusUserId, setEditStatusUserId] = useState<string | null>(null);
    const [newUserStatus, setNewUserStatus] = useState<'ACTIVE' | 'INVITED' | 'DISABLED'>('ACTIVE');
    const [editEmailUserId, setEditEmailUserId] = useState<string | null>(null);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);
    const { errors, setServerError, setFieldError, clearFieldError } = useInlineErrors();

    const allowManageUsers = currentUser ? canManageUsers(currentUser) : false;
    const allowDeleteUser = currentUser ? canDeleteUser(currentUser) : false;
    const allowModifyUserStatus = currentUser ? canModifyUserStatus(currentUser) : false;
    const currentUserIsSuperAdmin = currentUser ? isSuperAdmin(currentUser) : false;

    const canActOnTarget = (user: UserItem) =>
        user.id !== currentUser?.userId && (currentUserIsSuperAdmin || !isAdminRoleName(user.roleName));

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const tenantId = getStoredUser()?.tenantId;
            const result = await listUsersPaginated(page, PAGE_SIZE, currentUserIsSuperAdmin ? undefined : tenantId);
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
            const roles = response.map((role) => ({
                id: String(role.id),
                name: role.name || '-'
            }));
            setAvailableRoles(roles);
            const viewer = roles.find((role) => role.name.trim().toLowerCase() === 'viewer');
            setDefaultViewerRoleId(viewer ? viewer.id : '');
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

        const roleIdToAssign = selectedRole || defaultViewerRoleId;
        if (!roleIdToAssign) {
            toast.error(t('admin.users.roleRequired'));
            return;
        }

        try {
            const created = await createUser({
                email: email.trim(),
                password: password.trim(),
                status
            });

            await assignRoleToUser(created.id || created.userId || created.user?.id, roleIdToAssign);

            setEmail('');
            setPassword('');
            setStatus('ACTIVE');
            setSelectedRole('');
            toast.success(t('admin.users.userCreated'));
            await loadUsers();
        } catch (error: any) {
            const message = mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToCreateUser');
            toast.error(message);
        }
    };

    const handleAssignRole = async (userId: string) => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionManageRoles'));
            return;
        }

        if (userId === currentUser?.userId) {
            toast.error(t('admin.users.cannotChangeOwnRole'));
            return;
        }

        const target = users.find((u) => u.id === userId);
        if (target && !canActOnTarget(target)) {
            toast.error(t('admin.users.cannotModifyAdminUser'));
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
            const message = mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToAssignRole');
            toast.error(message);
        }
    };

    const handleRemoveRole = async (userId: string, roleId: string) => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionManageRoles'));
            return;
        }

        if (userId === currentUser?.userId) {
            toast.error(t('admin.users.cannotChangeOwnRole'));
            return;
        }

        const target = users.find((u) => u.id === userId);
        if (target && !canActOnTarget(target)) {
            toast.error(t('admin.users.cannotModifyAdminUser'));
            return;
        }

        try {
            await removeRoleFromUser(userId, roleId);
            toast.success(t('admin.users.roleRemoved'));
            await loadUsers();
        } catch (error: any) {
            const message = mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToRemoveRole');
            toast.error(message);
        }
    };

    const handleUpdateUserStatus = async (userId: string) => {
        if (!allowModifyUserStatus) {
            toast.error(t('admin.users.noPermissionModifyStatus'));
            return;
        }

        const target = users.find((u) => u.id === userId);
        if (target && !canActOnTarget(target)) {
            toast.error(t('admin.users.cannotModifyAdminUser'));
            return;
        }

        try {
            await updateUser(userId, { status: newUserStatus });
            toast.success(t('admin.users.userStatusUpdated'));
            setEditStatusUserId(null);
            await loadUsers();
        } catch (error: any) {
            const message = mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToUpdateUserStatus');
            toast.error(message);
        }
    };

    const handleUpdateUserEmail = async () => {
        if (!allowManageUsers) {
            toast.error(t('admin.users.noPermissionModifyEmail'));
            return;
        }
        if (!editEmailUserId) return;
        const target = users.find((u) => u.id === editEmailUserId);
        if (target && !canActOnTarget(target)) {
            toast.error(t('admin.users.cannotModifyAdminUser'));
            return;
        }
        const email = newUserEmail.trim();
        if (!email) {
            setFieldError('email', t('admin.users.emailRequired'));
            return;
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setFieldError('email', t('admin.users.invalidEmail'));
            return;
        }
        setSavingEmail(true);
        try {
            await updateUser(editEmailUserId, { email });
            toast.success(t('admin.users.userEmailUpdated'));
            setEditEmailUserId(null);
            setNewUserEmail('');
            clearFieldError('email');
            await loadUsers();
        } catch (error: any) {
            setServerError(error, 'email', mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToUpdateUserEmail'));
        } finally {
            setSavingEmail(false);
        }
    };

    const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const handleDeleteUser = async () => {
        const id = deleteDialogId;
        if (!id) return;

        if (!allowDeleteUser) {
            toast.error(t('admin.users.noPermissionDelete'));
            return;
        }

        if (id === currentUser?.userId) {
            toast.error(t('admin.users.cannotDeleteSelf'));
            return;
        }

        const target = users.find((u) => u.id === id);
        if (target && !canActOnTarget(target)) {
            toast.error(t('admin.users.cannotModifyAdminUser'));
            return;
        }

        setDeleting(true);
        try {
            await deleteUser(id);
            toast.success(t('admin.users.userDeleted'));
            setDeleteDialogId(null);
            await loadUsers();
        } catch (error: any) {
            const message = mapServerMessage(error?.response?.data?.message, t) || error?.response?.data?.message || error?.message || t('admin.users.failedToDeleteUser');
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

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
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 140px 140px auto' }, gap: 2 }}>
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
                                <TextField
                                    select
                                    label={t('admin.users.role')}
                                    value={selectedRole || defaultViewerRoleId}
                                    onChange={(event) => setSelectedRole(event.target.value)}
                                    size="small"
                                >
                                    {availableRoles.map((role) => (
                                        <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                                    ))}
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
                                        {allowManageUsers && canActOnTarget(user) && (
                                            <Button
                                                onClick={() => {
                                                    setEditEmailUserId(user.id);
                                                    setNewUserEmail(user.email);
                                                    clearFieldError('email');
                                                }}
                                                size="small"
                                                startIcon={<EmailOutlinedIcon sx={{ fontSize: 15 }} />}
                                                sx={{ mt: 0.5, p: 0, minHeight: 0, fontSize: 12, fontWeight: 700, color: C.brand, background: 'transparent', '&:hover': { background: 'transparent', textDecoration: 'underline' } }}
                                            >
                                                {t('admin.users.editEmail')}
                                            </Button>
                                        )}
                                    </Box>
                                    {editStatusUserId === user.id ? (
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                            <TextField
                                                select
                                                size="small"
                                                value={newUserStatus}
                                                onChange={(event) =>
                                                    setNewUserStatus(event.target.value as 'ACTIVE' | 'INVITED' | 'DISABLED')
                                                }
                                                sx={{ width: 120 }}
                                            >
                                                <MenuItem value="ACTIVE">{t('admin.users.active')}</MenuItem>
                                                <MenuItem value="INVITED">{t('admin.users.invited')}</MenuItem>
                                                <MenuItem value="DISABLED">{t('admin.users.disabled')}</MenuItem>
                                            </TextField>
                                            <Button
                                                onClick={() => handleUpdateUserStatus(user.id)}
                                                disabled={!allowModifyUserStatus}
                                                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                                                sx={{ color: '#FFFFFF', fontWeight: 700 }}
                                            >
                                                {t('common.save')}
                                            </Button>
                                            <Button
                                                onClick={() => setEditStatusUserId(null)}
                                                startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
                                                variant="outlined"
                                                sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted, '&:hover': { borderColor: C.muted, backgroundColor: '#F9FAFB' } }}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip
                                                label={t(STATUS_LABELS[user.status] || user.status)}
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
                                            {allowModifyUserStatus && canActOnTarget(user) && (
                                                <Button
                                                    onClick={() => {
                                                        setEditStatusUserId(user.id);
                                                        setNewUserStatus(user.status);
                                                    }}
                                                    startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                                                    variant="outlined"
                                                    sx={{ borderRadius: 5, textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.muted, color: '#27323F', px: 1.5, '&:hover': { borderColor: C.text, backgroundColor: '#F3F4F6' } }}
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
                                                onDelete={allowManageUsers && user.roleId && user.id !== currentUser?.userId && canActOnTarget(user) ? () => handleRemoveRole(user.id, user.roleId as string) : undefined}
                                                size="small"
                                                sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                                            />
                                        </Stack>
                                    )}
                                </Box>

                                {currentUserIsSuperAdmin && user.tenantName && (
                                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, backgroundColor: '#F5F3FF', border: '1px solid #EDE9FE' }}>
                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {t('admin.users.tenant')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#5E4B9E' }}>
                                            {user.tenantName}
                                        </Typography>
                                    </Box>
                                )}
                                {allowManageUsers && user.id !== currentUser?.userId && canActOnTarget(user) ? (
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
                            {allowDeleteUser && canActOnTarget(user) ? (
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

            <Dialog open={editEmailUserId !== null} onClose={() => !savingEmail && setEditEmailUserId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <EmailOutlinedIcon sx={{ color: '#fff', fontSize: 18 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>{t('admin.users.editEmailTitle')}</Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{editEmailUserId ? users.find((u) => u.id === editEmailUserId)?.fullName : ''}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    <TextField
                        label={t('common.email')}
                        fullWidth
                        value={newUserEmail}
                        onChange={(event) => { setNewUserEmail(event.target.value); clearFieldError('email'); }}
                        disabled={savingEmail}
                        autoFocus
                        error={Boolean(errors.email)}
                        helperText={errors.email}
                        slotProps={{ htmlInput: { 'data-lpignore': 'true' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setEditEmailUserId(null)} disabled={savingEmail} variant="outlined" startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted, '&:hover': { borderColor: C.muted, backgroundColor: '#F9FAFB' } }}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleUpdateUserEmail}
                        disabled={savingEmail}
                        startIcon={savingEmail ? undefined : <SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                        sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: '#fff', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', '&:hover': { background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' } }}
                    >
                        {savingEmail ? t('common.saving') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDialogId !== null} onClose={() => !deleting && setDeleteDialogId(null)}>
                <DialogTitle>{t('admin.users.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.users.confirmDeleteBody')}
                        {deleteDialogId && (
                            <Typography component="span" sx={{ fontWeight: 700, color: C.danger, display: 'block', mt: 1 }}>
                                {users.find((u) => u.id === deleteDialogId)?.email || ''}
                            </Typography>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogId(null)} disabled={deleting}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleDeleteUser}
                        disabled={deleting}
                        sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}
                    >
                        {deleting ? t('common.deleting') : t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersPage;
