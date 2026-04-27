import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import {
  assignRoleToUser,
  createUser,
  deleteUser,
  listRoles,
  listUserRoles,
  listUsers,
  removeRoleFromUser,
} from '../../../services/adminService';
import { canManageUsers } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';

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
  roleId: null,
});

const UsersPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INVITED' | 'DISABLED'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const allowManageUsers = currentUser ? canManageUsers(currentUser) : false;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await listUsers();
      const baseUsers = response.map(toUserItem);

      const usersWithRoles = await Promise.all(
        baseUsers.map(async (user) => {
          try {
            const userRoles = await listUserRoles(user.id);
            return {
              ...user,
              roleName: userRoles[0]?.name || null,
              roleId: userRoles[0]?.id ? String(userRoles[0].id) : null,
            };
          } catch {
            return user;
          }
        }),
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load users';
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
          name: role.name || '-',
        })),
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load roles';
      toast.error(message);
    }
  };

  useEffect(() => {
    loadRoles();
    loadUsers();
  }, []);

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
        ? [user.fullName, user.email, user.status]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus = filterStatus ? user.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, search, users]);

  const addUser = async () => {
    if (!allowManageUsers) {
      toast.error('You do not have permission to create users');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!password.trim()) {
      toast.error('Password is required');
      return;
    }

    try {
      await createUser({
        email: email.trim(),
        password: password.trim(),
        status,
      });
      setEmail('');
      setPassword('');
      setStatus('ACTIVE');
      toast.success('User created');
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create user';
      toast.error(message);
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!allowManageUsers) {
      toast.error('You do not have permission to manage user roles');
      return;
    }

    const roleId = selectedRoleByUser[userId];
    if (!roleId) {
      toast.error('Select a role first');
      return;
    }

    try {
      await assignRoleToUser(userId, roleId);
      toast.success('Role assigned');
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to assign role';
      toast.error(message);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!allowManageUsers) {
      toast.error('You do not have permission to manage user roles');
      return;
    }

    try {
      await removeRoleFromUser(userId, roleId);
      toast.success('Role removed');
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to remove role';
      toast.error(message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!allowManageUsers) {
      toast.error('You do not have permission to delete users');
      return;
    }

    try {
      await deleteUser(id);
      toast.success('User deleted');
      await loadUsers();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete user';
      toast.error(message);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Users
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Manage users with a cleaner dashboard, quick search and status filters.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total users
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {users.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Visible users
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filteredUsers.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Active users
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {users.filter((user) => user.status === 'ACTIVE').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {allowManageUsers ? (
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Create User
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px auto', gap: 2 }}>
              <TextField
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label="Temporary password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <TextField
                select
                label="Status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'ACTIVE' | 'INVITED' | 'DISABLED')
                }
              >
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INVITED">INVITED</MenuItem>
                <MenuItem value="DISABLED">DISABLED</MenuItem>
              </TextField>
              <Button onClick={addUser}>Create</Button>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Users
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 2 }}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or status"
            />
            <TextField
              select
              label="Status filter"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INVITED">INVITED</MenuItem>
              <MenuItem value="DISABLED">DISABLED</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {loading ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>Loading users...</Typography>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No users found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {user.fullName}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>{user.email}</Typography>
                  </Box>
                  <Chip
                    label={user.status}
                    size="small"
                    sx={{
                      backgroundColor:
                        user.status === 'ACTIVE'
                          ? '#DCFCE7'
                          : user.status === 'INVITED'
                            ? '#FEF3C7'
                            : '#FEE2E2',
                      color:
                        user.status === 'ACTIVE'
                          ? '#166534'
                          : user.status === 'INVITED'
                            ? '#92400E'
                            : '#991B1B',
                      fontWeight: 700,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  ID: {user.id}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Roles
                  </Typography>

                  {!user.roleName ? (
                    <Typography sx={{ color: '#64748B', mt: 0.5 }}>No role assigned</Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                      <Chip
                        label={user.roleName}
                        onDelete={
                          allowManageUsers && user.roleId
                            ? () => handleRemoveRole(user.id, user.roleId as string)
                            : undefined
                        }
                        size="small"
                        sx={{
                          backgroundColor: '#EEF2FF',
                          color: '#4338CA',
                          fontWeight: 700,
                          mb: 1,
                        }}
                      />
                    </Stack>
                  )}

                  {allowManageUsers ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 1,
                        mt: 1.5,
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        label="Role"
                        value={selectedRoleByUser[user.id] || ''}
                        onChange={(event) =>
                          setSelectedRoleByUser((previous) => ({
                            ...previous,
                            [user.id]: event.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">Select role</MenuItem>
                        {availableRoles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button onClick={() => handleAssignRole(user.id)}>Set Role</Button>
                    </Box>
                  ) : null}
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                {allowManageUsers ? (
                  <Button onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                ) : null}
              </CardActions>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default UsersPage;
