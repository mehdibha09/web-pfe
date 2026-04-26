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
  createTenant,
  disableTenant,
  listTenants,
  updateTenantStatus,
} from '../../../services/adminService';

type TenantItem = {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  usersCount: number;
  status: 'ACTIVE' | 'DISABLED';
};

const planColors: Record<TenantItem['plan'], { bg: string; color: string }> = {
  FREE: { bg: '#E0F2FE', color: '#075985' },
  PRO: { bg: '#FCE7F3', color: '#BE185D' },
  ENTERPRISE: { bg: '#EDE9FE', color: '#5B21B6' },
};

const statusColors: Record<TenantItem['status'], { bg: string; color: string }> = {
  ACTIVE: { bg: '#DCFCE7', color: '#166534' },
  DISABLED: { bg: '#FEE2E2', color: '#991B1B' },
};

const toTenantItem = (tenant: any): TenantItem => {
  const mode = String(tenant.modeDeployment || 'PRO').toUpperCase();
  const plan: TenantItem['plan'] =
    mode === 'FREE' || mode === 'PRO' || mode === 'ENTERPRISE' ? mode : 'PRO';

  return {
    id: String(tenant.id),
    name: tenant.name || '-',
    code: String(tenant.name || '-')
      .replace(/\s+/g, '')
      .slice(0, 8)
      .toUpperCase(),
    contactEmail: tenant.contactEmail || '',
    plan,
    usersCount: Number(tenant.usersCount || 0),
    status: ['DISABLED', 'DELETED'].includes(String(tenant.status || 'ACTIVE').toUpperCase())
      ? 'DISABLED'
      : 'ACTIVE',
  };
};

const TenantsPage = () => {
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [plan, setPlan] = useState<TenantItem['plan']>('PRO');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await listTenants();
      setTenants(response.map(toTenantItem));
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load tenants';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch = search
        ? [tenant.name, tenant.code, tenant.contactEmail, tenant.plan, tenant.status]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus = filterStatus ? tenant.status === filterStatus : true;
      const matchesPlan = filterPlan ? tenant.plan === filterPlan : true;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [filterPlan, filterStatus, search, tenants]);

  const handleCreateTenant = async () => {
    if (!tenantName.trim()) {
      toast.error('Tenant name is required');
      return;
    }

    try {
      await createTenant({
        name: tenantName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        modeDeployment: plan,
        status: 'ACTIVE',
      });

      setTenantName('');
      setTenantCode('');
      setContactEmail('');
      setPlan('PRO');
      toast.success('Tenant created');
      await loadTenants();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create tenant';
      toast.error(message);
    }
  };

  const handleDisableTenant = async (id: string) => {
    setStatusUpdatingId(id);
    try {
      await disableTenant(id);
      toast.success('Tenant disabled');
      await loadTenants();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to disable tenant';
      toast.error(message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleEnableTenant = async (id: string) => {
    setStatusUpdatingId(id);
    try {
      await updateTenantStatus(id, 'ACTIVE');
      toast.success('Tenant enabled');
      await loadTenants();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to enable tenant';
      toast.error(message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Tenants
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Manage tenant records with a better dashboard, card layout and plan filters.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total tenants
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {tenants.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Active tenants
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {tenants.filter((tenant) => tenant.status === 'ACTIVE').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Visible tenants
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filteredTenants.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Enterprise tenants
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {tenants.filter((tenant) => tenant.plan === 'ENTERPRISE').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Create Tenant
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 180px auto', gap: 2 }}>
            <TextField
              label="Tenant name"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
            />
            <TextField
              label="Tenant code"
              value={tenantCode}
              onChange={(event) => setTenantCode(event.target.value)}
            />
            <TextField
              label="Contact email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
            <TextField
              select
              label="Plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value as TenantItem['plan'])}
            >
              <MenuItem value="FREE">FREE</MenuItem>
              <MenuItem value="PRO">PRO</MenuItem>
              <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
            </TextField>
            <Button onClick={handleCreateTenant}>Create</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Tenants
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 2 }}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, code, email or status"
            />
            <TextField
              select
              label="Status filter"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="DISABLED">DISABLED</MenuItem>
            </TextField>
            <TextField
              select
              label="Plan filter"
              value={filterPlan}
              onChange={(event) => setFilterPlan(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="FREE">FREE</MenuItem>
              <MenuItem value="PRO">PRO</MenuItem>
              <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {loading ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>Loading tenants...</Typography>
            </CardContent>
          </Card>
        ) : filteredTenants.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No tenants found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredTenants.map((tenant) => (
            <Card
              key={tenant.id}
              sx={{
                borderRadius: 3,
                border: '1px solid #E2E8F0',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {tenant.name}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>{tenant.code}</Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}
                  >
                    <Chip
                      label={tenant.plan}
                      size="small"
                      sx={{
                        backgroundColor: planColors[tenant.plan].bg,
                        color: planColors[tenant.plan].color,
                        fontWeight: 700,
                      }}
                    />
                    <Chip
                      label={tenant.status}
                      size="small"
                      sx={{
                        backgroundColor: statusColors[tenant.status].bg,
                        color: statusColors[tenant.status].color,
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                  <strong>Contact:</strong> {tenant.contactEmail || '-'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                  <strong>Users:</strong> {tenant.usersCount}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  <strong>ID:</strong> {tenant.id}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                <Button
                  onClick={() =>
                    tenant.status === 'DISABLED'
                      ? handleEnableTenant(tenant.id)
                      : handleDisableTenant(tenant.id)
                  }
                  disabled={statusUpdatingId === tenant.id}
                >
                  {tenant.status === 'DISABLED' ? 'Enable' : 'Disable'}
                </Button>
              </CardActions>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TenantsPage;
