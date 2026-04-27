import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import {
  addPermissionToRole,
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  removePermissionFromRole,
  updateRole,
} from '../../../services/adminService';

type RoleItem = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  usersCount: number;
};

type PermissionItem = {
  id: string;
  name: string;
  description: string;
};

const RolesPage = () => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [filterPermission, setFilterPermission] = useState('');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedPermissionByRole, setSelectedPermissionByRole] = useState<Record<string, string>>(
    {},
  );
  const [newPermissionByRole, setNewPermissionByRole] = useState<Record<string, string>>({});

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await listRoles();
      const mapped = response.map((role) => ({
        id: String(role.id),
        name: role.name || '-',
        description: role.description || '',
        permissions: role.permissions || [],
        usersCount: 0,
      }));
      setRoles(mapped);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load roles';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await listPermissions();
      setPermissions(
        response.map((permission) => ({
          id: String(permission.id),
          name: permission.name || '-',
          description: permission.description || '',
        })),
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to load permissions';
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

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      await createRole({
        name: roleName.trim(),
        description: description.trim(),
      });
      setRoleName('');
      setDescription('');
      toast.success('Role created');
      await loadRoles();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create role';
      toast.error(message);
    }
  };

  const handleRemoveRole = async (id: string) => {
    try {
      await deleteRole(id);
      toast.success('Role deleted');
      await loadRoles();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete role';
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
    if (!editingName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      await updateRole(id, {
        name: editingName.trim(),
        description: editingDescription.trim(),
      });
      toast.success('Role updated');
      cancelEditRole();
      await loadRoles();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update role';
      toast.error(message);
    }
  };

  const handleAddPermission = async (roleId: string) => {
    const selectedPermissionId = selectedPermissionByRole[roleId] || '';
    const newPermissionName = (newPermissionByRole[roleId] || '').trim();

    if (!selectedPermissionId && !newPermissionName) {
      toast.error('Select a permission or enter a new permission name');
      return;
    }

    try {
      if (selectedPermissionId) {
        await addPermissionToRole(roleId, { permissionId: selectedPermissionId });
      } else {
        await addPermissionToRole(roleId, { permissionName: newPermissionName });
      }

      toast.success('Permission added to role');
      setSelectedPermissionByRole((previous) => ({ ...previous, [roleId]: '' }));
      setNewPermissionByRole((previous) => ({ ...previous, [roleId]: '' }));
      await loadPermissions();
      await loadRoles();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to add permission';
      toast.error(message);
    }
  };

  const handleRemovePermission = async (roleId: string, permissionName: string) => {
    const permission = permissions.find((item) => item.name === permissionName);
    if (!permission) {
      toast.error('Permission identifier not found');
      return;
    }

    try {
      await removePermissionFromRole(roleId, permission.id);
      toast.success('Permission removed from role');
      await loadRoles();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to remove permission';
      toast.error(message);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Roles
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Create roles, manage permissions and filter by matching permission keys.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total roles
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {roles.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Matching roles
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filteredRoles.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total linked users
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {roles.reduce((sum, role) => sum + role.usersCount, 0)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Create Role
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 2 }}>
            <TextField
              label="Role name"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button onClick={handleCreateRole}>Create</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Roles
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 2 }}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by role name, description or permission"
            />
            <TextField
              label="Permission filter"
              value={filterPermission}
              onChange={(event) => setFilterPermission(event.target.value)}
              placeholder="e.g. USER_CREATE"
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {loading ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>Loading roles...</Typography>
            </CardContent>
          </Card>
        ) : filteredRoles.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No roles found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredRoles.map((role) => (
            <Card key={role.id} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    {editingRoleId === role.id ? (
                      <Box sx={{ display: 'grid', gap: 1 }}>
                        <TextField
                          size="small"
                          label="Role name"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                        />
                        <TextField
                          size="small"
                          label="Description"
                          value={editingDescription}
                          onChange={(event) => setEditingDescription(event.target.value)}
                        />
                      </Box>
                    ) : (
                      <>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {role.name}
                        </Typography>
                        <Typography sx={{ color: '#64748B' }}>{role.description || '-'}</Typography>
                      </>
                    )}
                  </Box>
                  <Chip
                    label={`${role.permissions.length} permissions`}
                    size="small"
                    sx={{ backgroundColor: '#FCE7EF', color: '#E4477D', fontWeight: 700 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {role.permissions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      No permissions assigned
                    </Typography>
                  ) : (
                    role.permissions.map((permission) => (
                      <Chip
                        key={permission}
                        label={permission}
                        onDelete={() => handleRemovePermission(role.id, permission)}
                        size="small"
                        sx={{ backgroundColor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}
                      />
                    ))
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1.5, mt: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Existing permission"
                    value={selectedPermissionByRole[role.id] || ''}
                    onChange={(event) =>
                      setSelectedPermissionByRole((previous) => ({
                        ...previous,
                        [role.id]: event.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">Select permission</MenuItem>
                    {permissions.map((permission) => (
                      <MenuItem key={permission.id} value={permission.id}>
                        {permission.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="New permission"
                    placeholder="e.g. USER_EXPORT"
                    value={newPermissionByRole[role.id] || ''}
                    onChange={(event) =>
                      setNewPermissionByRole((previous) => ({
                        ...previous,
                        [role.id]: event.target.value,
                      }))
                    }
                  />
                  <Button onClick={() => handleAddPermission(role.id)}>Add Permission</Button>
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                {editingRoleId === role.id ? (
                  <>
                    <Button onClick={cancelEditRole}>Cancel</Button>
                    <Button onClick={() => handleUpdateRole(role.id)}>Save</Button>
                  </>
                ) : (
                  <Button onClick={() => startEditRole(role)}>Edit</Button>
                )}
                <Button onClick={() => handleRemoveRole(role.id)}>Delete</Button>
              </CardActions>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default RolesPage;
