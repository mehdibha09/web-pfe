import { Box, Card, CardActions, CardContent, Chip, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import { createRole, deleteRole, listRoles } from '../../../services/adminService';

type RoleItem = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  usersCount: number;
};

const RolesPage = () => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [filterPermission, setFilterPermission] = useState('');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    loadRoles();
  }, []);

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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {role.name}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>{role.description || '-'}</Typography>
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
                        size="small"
                        sx={{ backgroundColor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}
                      />
                    ))
                  )}
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
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
