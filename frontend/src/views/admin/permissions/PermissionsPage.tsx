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
  createPermission,
  deletePermission,
  listPermissions,
} from '../../../services/adminService';

type PermissionItem = {
  id: string;
  key: string;
  action: string;
  resource: string;
  category: string;
  description: string;
};

const categories = ['AUTH', 'USER', 'ROLE', 'TENANT', 'SESSION', 'AUDIT'];

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
    category: resource,
    description: permission.description || '',
  };
};

const PermissionsPage = () => {
  const [permissionKey, setPermissionKey] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await listPermissions();
      setPermissions(response.map(parsePermission));
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to load permissions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = query
        ? [
            permission.key,
            permission.action,
            permission.resource,
            permission.category,
            permission.description,
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)
        : true;

      const matchesAction = filterAction ? permission.action === filterAction : true;
      const matchesResource = filterResource ? permission.resource === filterResource : true;
      const matchesCategory = filterCategory ? permission.category === filterCategory : true;

      return matchesSearch && matchesAction && matchesResource && matchesCategory;
    });
  }, [filterAction, filterCategory, filterResource, permissions, search]);

  const handleCreatePermission = async () => {
    if (!permissionKey.trim()) {
      toast.error('Permission key is required');
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
        description: generatedDescription,
      });

      setPermissionKey('');
      setAction('');
      setResource('');
      setCategory('');
      setDescription('');
      toast.success('Permission created');
      await loadPermissions();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to create permission';
      toast.error(message);
    }
  };

  const handleRemovePermission = async (id: string) => {
    try {
      await deletePermission(id);
      toast.success('Permission deleted');
      await loadPermissions();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to delete permission';
      toast.error(message);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Permissions
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Create and filter permissions in a cleaner admin dashboard.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total permissions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {permissions.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Matching filters
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filteredPermissions.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Latest key
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {permissions[permissions.length - 1]?.key || '—'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Create Permission
          </Typography>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto', gap: 2 }}
          >
            <TextField
              label="Permission key"
              value={permissionKey}
              onChange={(event) => setPermissionKey(event.target.value)}
            />
            <TextField
              select
              label="Action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <MenuItem value="">Select</MenuItem>
              <MenuItem value="CREATE">CREATE</MenuItem>
              <MenuItem value="READ">READ</MenuItem>
              <MenuItem value="UPDATE">UPDATE</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
              <MenuItem value="MANAGE">MANAGE</MenuItem>
            </TextField>
            <TextField
              select
              label="Resource"
              value={resource}
              onChange={(event) => setResource(event.target.value)}
            >
              <MenuItem value="">Select</MenuItem>
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="ROLE">ROLE</MenuItem>
              <MenuItem value="TENANT">TENANT</MenuItem>
              <MenuItem value="SESSION">SESSION</MenuItem>
              <MenuItem value="AUDIT">AUDIT</MenuItem>
            </TextField>
            <TextField
              select
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <MenuItem value="">Select</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button onClick={handleCreatePermission}>Create</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Permissions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 2 }}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by key, action, resource, category or description"
            />
            <TextField
              select
              label="Action filter"
              value={filterAction}
              onChange={(event) => setFilterAction(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CREATE">CREATE</MenuItem>
              <MenuItem value="READ">READ</MenuItem>
              <MenuItem value="UPDATE">UPDATE</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
              <MenuItem value="MANAGE">MANAGE</MenuItem>
            </TextField>
            <TextField
              select
              label="Resource filter"
              value={filterResource}
              onChange={(event) => setFilterResource(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="ROLE">ROLE</MenuItem>
              <MenuItem value="TENANT">TENANT</MenuItem>
              <MenuItem value="SESSION">SESSION</MenuItem>
              <MenuItem value="AUDIT">AUDIT</MenuItem>
              <MenuItem value="GENERAL">GENERAL</MenuItem>
            </TextField>
            <TextField
              select
              label="Category filter"
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {loading ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>Loading permissions...</Typography>
            </CardContent>
          </Card>
        ) : filteredPermissions.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No permissions found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredPermissions.map((permission) => (
            <Card
              key={permission.id}
              sx={{
                borderRadius: 3,
                border: '1px solid #E2E8F0',
                backgroundColor: '#fff',
                height: '100%',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {permission.key}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>
                      {permission.description || '-'}
                    </Typography>
                  </Box>
                  <Chip
                    label={permission.action || 'N/A'}
                    size="small"
                    sx={{ backgroundColor: '#FCE7EF', color: '#E4477D', fontWeight: 700 }}
                  />
                </Box>

                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                  <strong>Resource:</strong> {permission.resource || '-'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  <strong>Category:</strong> {permission.category || '-'}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  ID: {permission.id}
                </Typography>
                <Button onClick={() => handleRemovePermission(permission.id)}>Delete</Button>
              </CardActions>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default PermissionsPage;
