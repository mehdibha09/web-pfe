import {
    Box, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DomainIcon from '@mui/icons-material/Domain';
import EditIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { C } from '../../../theme/tokens';
import PaginationBar from '../../../components/PaginationBar';
import {
    createTenant,
    disableTenant,
    listTenants,
    listTenantsPaginated,
    updateTenant,
    updateTenantStatus
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
    FREE: { bg: '#E4EEF7', color: '#2E5C8A' },
    PRO: { bg: C.brandLight, color: C.brandDark },
    ENTERPRISE: { bg: '#E9E6F6', color: '#5E4B9E' }
};

const statusColors: Record<TenantItem['status'], { bg: string; color: string }> = {
    ACTIVE: { bg: '#E0F1E6', color: '#2E7A4F' },
    DISABLED: { bg: '#F7DEE3', color: '#A23B4E' }
};

const toTenantItem = (tenant: any): TenantItem => {
    const mode = String(tenant.modeDeployment || 'PRO').toUpperCase();
    const plan: TenantItem['plan'] = mode === 'FREE' || mode === 'PRO' || mode === 'ENTERPRISE' ? mode : 'PRO';

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
            : 'ACTIVE'
    };
};

const TenantsPage = () => {
    const { t } = useTranslation();
    const [tenantName, setTenantName] = useState('');
    const [tenantCode, setTenantCode] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [plan, setPlan] = useState<TenantItem['plan']>('PRO');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPlan, setFilterPlan] = useState('');
    const [tenants, setTenants] = useState<TenantItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPlan, setEditPlan] = useState<TenantItem['plan']>('PRO');
    const [disableDialogId, setDisableDialogId] = useState<string | null>(null);
    const [disableAction, setDisableAction] = useState<'enable' | 'disable'>('disable');
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const loadTenants = async () => {
        setLoading(true);
        try {
            const result = await listTenantsPaginated(page, PAGE_SIZE);
            setTenants(result.items.map(toTenantItem));
            setTotalElements(result.total);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.tenants.failedToLoadTenants');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, [page]);

    useEffect(() => {
        if (page >= pageCount && page > 0) setPage(pageCount - 1);
    }, [totalElements]);

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

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleCreateTenant = async () => {
        if (!tenantName.trim()) {
            toast.error(t('admin.tenants.tenantNameRequired'));
            return;
        }

        try {
            await createTenant({
                name: tenantName.trim(),
                code: tenantCode.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
                modeDeployment: plan,
                status: 'ACTIVE'
            });

            setTenantName('');
            setTenantCode('');
            setContactEmail('');
            setPlan('PRO');
            toast.success(t('admin.tenants.tenantCreated'));
            await loadTenants();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.tenants.failedToCreateTenant');
            toast.error(message);
        }
    };

    const handleDisableTenant = async (id: string) => {
        setStatusUpdatingId(id);
        try {
            await disableTenant(id);
            toast.success(t('admin.tenants.tenantDisabled'));
            await loadTenants();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.tenants.failedToDisableTenant');
            toast.error(message);
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const handleEnableTenant = async (id: string) => {
        setStatusUpdatingId(id);
        try {
            await updateTenantStatus(id, 'ACTIVE');
            toast.success(t('admin.tenants.tenantEnabled'));
            await loadTenants();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.tenants.failedToEnableTenant');
            toast.error(message);
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const handleUpdateTenant = async (tenantId: string) => {
        if (!editName.trim()) {
            toast.error(t('admin.tenants.tenantNameRequired'));
            return;
        }

        try {
            await updateTenant(tenantId, {
                name: editName.trim(),
                contactEmail: editEmail.trim() || undefined,
                modeDeployment: editPlan
            });
            toast.success(t('admin.tenants.tenantUpdated'));
            setEditingTenantId(null);
            await loadTenants();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || t('admin.tenants.failedToUpdateTenant');
            toast.error(message);
        }
    };

    const startEditTenant = (tenant: TenantItem) => {
        setEditingTenantId(tenant.id);
        setEditName(tenant.name);
        setEditEmail(tenant.contactEmail);
        setEditPlan(tenant.plan);
    };

    const cancelEditTenant = () => {
        setEditingTenantId(null);
        setEditName('');
        setEditEmail('');
        setEditPlan('PRO');
    };

    const planGradient = (p: TenantItem['plan']) => {
        switch (p) {
            case 'FREE': return 'linear-gradient(90deg, #3B82F6, #60A5FA)';
            case 'PRO': return 'linear-gradient(90deg, #E4477D, #BE185D)';
            case 'ENTERPRISE': return 'linear-gradient(90deg, #7C3AED, #A78BFA)';
        }
    };

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.tenants.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.tenants.subtitle')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                {[
                    { label: t('admin.tenants.totalTenants'), value: totalElements, icon: <DomainIcon />, gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)' },
                    { label: t('admin.tenants.activeTenants'), value: tenants.filter((t) => t.status === 'ACTIVE').length, icon: <CheckCircleOutlinedIcon />, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
                    { label: t('admin.tenants.visibleTenants'), value: filteredTenants.length, icon: <VisibilityIcon />, gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)' },
                    { label: t('admin.tenants.enterpriseTenants'), value: tenants.filter((t) => t.plan === 'ENTERPRISE').length, icon: <WorkspacePremiumIcon />, gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }
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
                <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AddIcon sx={{ color: C.brand }} />
                            {t('admin.tenants.createTenant')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('admin.tenants.tenantName')}
                                value={tenantName}
                                onChange={(event) => setTenantName(event.target.value)}
                                size="small"
                            />
                            <TextField
                                label={t('admin.tenants.tenantCode')}
                                value={tenantCode}
                                onChange={(event) => setTenantCode(event.target.value)}
                                size="small"
                            />
                            <TextField
                                label={t('admin.tenants.contactEmail')}
                                value={contactEmail}
                                onChange={(event) => setContactEmail(event.target.value)}
                                size="small"
                            />
                            <TextField
                                select
                                label={t('admin.tenants.plan')}
                                value={plan}
                                onChange={(event) => setPlan(event.target.value as TenantItem['plan'])}
                                size="small"
                            >
                                <MenuItem value="FREE">{t('admin.tenants.free')}</MenuItem>
                                <MenuItem value="PRO">{t('admin.tenants.pro')}</MenuItem>
                                <MenuItem value="ENTERPRISE">{t('admin.tenants.enterprise')}</MenuItem>
                            </TextField>
                            <Box sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' }, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCreateTenant} startIcon={<AddIcon />}>{t('common.create')}</Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon sx={{ color: '#0EA5E9' }} />
                            {t('admin.tenants.filterTenants')}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('common.search')}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t('admin.tenants.searchPlaceholder')}
                                size="small"
                                sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}
                            />
                            <TextField
                                select
                                label={t('admin.tenants.statusFilter')}
                                value={filterStatus}
                                onChange={(event) => setFilterStatus(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.all')}</MenuItem>
                                <MenuItem value="ACTIVE">{t('admin.tenants.active')}</MenuItem>
                                <MenuItem value="DISABLED">{t('admin.tenants.disabled')}</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label={t('admin.tenants.planFilter')}
                                value={filterPlan}
                                onChange={(event) => setFilterPlan(event.target.value)}
                                size="small"
                            >
                                <MenuItem value="">{t('common.all')}</MenuItem>
                                <MenuItem value="FREE">{t('admin.tenants.free')}</MenuItem>
                                <MenuItem value="PRO">{t('admin.tenants.pro')}</MenuItem>
                                <MenuItem value="ENTERPRISE">{t('admin.tenants.enterprise')}</MenuItem>
                            </TextField>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filteredTenants.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <DomainIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {t('admin.tenants.noTenantsFound')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('admin.tenants.tryAdjustingFilter')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {filteredTenants.map((tenant) => (
                        <Card
                            key={tenant.id}
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
                                    background: planGradient(tenant.plan),
                                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                                }}
                            />
                            <CardContent sx={{ pt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {editingTenantId === tenant.id ? (
                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                <TextField
                                                    size="small"
                                                    label={t('admin.tenants.tenantName')}
                                                    value={editName}
                                                    onChange={(event) => setEditName(event.target.value)}
                                                />
                                                <TextField
                                                    size="small"
                                                    label={t('admin.tenants.contactEmail')}
                                                    value={editEmail}
                                                    onChange={(event) => setEditEmail(event.target.value)}
                                                />
                                                <TextField
                                                    size="small"
                                                    select
                                                    label={t('admin.tenants.plan')}
                                                    value={editPlan}
                                                    onChange={(event) => setEditPlan(event.target.value as TenantItem['plan'])}
                                                >
                                                    <MenuItem value="FREE">{t('admin.tenants.free')}</MenuItem>
                                                    <MenuItem value="PRO">{t('admin.tenants.pro')}</MenuItem>
                                                    <MenuItem value="ENTERPRISE">{t('admin.tenants.enterprise')}</MenuItem>
                                                </TextField>
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                                                    <Button onClick={() => handleUpdateTenant(tenant.id)}>{t('common.save')}</Button>
                                                    <Button onClick={cancelEditTenant}>{t('common.cancel')}</Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                                    {tenant.name}
                                                </Typography>
                                                <Typography sx={{ color: C.muted }}>{tenant.code}</Typography>
                                            </>
                                        )}
                                    </Box>
                                    {editingTenantId !== tenant.id && (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', alignSelf: 'flex-start' }}>
                                            <Chip
                                                label={tenant.plan}
                                                size="small"
                                                sx={{
                                                    backgroundColor: planColors[tenant.plan].bg,
                                                    color: planColors[tenant.plan].color,
                                                    fontWeight: 700
                                                }}
                                            />
                                            <Chip
                                                label={tenant.status}
                                                size="small"
                                                sx={{
                                                    backgroundColor: statusColors[tenant.status].bg,
                                                    color: statusColors[tenant.status].color,
                                                    fontWeight: 700
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>

                                {editingTenantId !== tenant.id && (
                                    <>
                                        <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                                    {t('admin.tenants.contact')}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: C.text }}>
                                                    {tenant.contactEmail || '-'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                                    {t('admin.tenants.users')}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: C.text }}>
                                                    {tenant.usersCount}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </CardContent>
                            {editingTenantId !== tenant.id && (
                                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                                    <Button onClick={() => startEditTenant(tenant)} startIcon={<EditIcon />}>{t('common.edit')}</Button>
                                    <Button
                                        onClick={() => {
                                            if (tenant.status === 'DISABLED') {
                                                handleEnableTenant(tenant.id);
                                            } else {
                                                setDisableAction('disable');
                                                setDisableDialogId(tenant.id);
                                            }
                                        }}
                                        disabled={statusUpdatingId === tenant.id}
                                        variant="text"
                                        sx={{
                                            color: tenant.status === 'DISABLED' ? '#10B981' : '#DC2626',
                                            background: 'transparent',
                                            '&:hover': {
                                                background: tenant.status === 'DISABLED'
                                                    ? 'rgba(16,185,129,0.08)'
                                                    : 'rgba(220,38,38,0.08)'
                                            }
                                        }}
                                        startIcon={tenant.status === 'DISABLED' ? <CheckCircleOutlinedIcon /> : <BlockIcon />}
                                    >
                                        {tenant.status === 'DISABLED' ? t('admin.tenants.enable') : t('admin.tenants.disable')}
                                    </Button>
                                </CardActions>
                            )}
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={!!disableDialogId} onClose={() => setDisableDialogId(null)}>
                <DialogTitle>{t('admin.tenants.confirmDisableTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.tenants.confirmDisableBody')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisableDialogId(null)}>{t('common.cancel')}</Button>
                    <Button
                        onClick={async () => {
                            if (disableDialogId) await handleDisableTenant(disableDialogId);
                            setDisableDialogId(null);
                        }}
                        sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}
                    >
                        {t('admin.tenants.disable')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TenantsPage;
