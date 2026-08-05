import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Group as GroupIcon, Refresh as RefreshIcon, Search as SearchIcon, Security as SecurityIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, CardActions, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper, Skeleton, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { k8sService } from '../../../services/k8sService';
import type { K8sRoleBindingRequest, K8sRoleRequest, K8sServiceAccountRequest, K8sServiceAccountResponse, K8sRoleResponse, K8sRoleBindingResponse, RoleBindingSubject } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { canManageK8s } from '../../../services/authorization';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';
import { useInlineErrors } from '../../../hooks/useInlineErrors';

type Section = 'serviceaccounts' | 'roles' | 'rolebindings';

const SectionTab = ({ value, label, count, icon }: { value: Section; label: string; count: number; icon: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1 }}>
        {icon}
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
        <Chip label={count} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#FCE7F3', color: '#BE185D' }} />
    </Box>
);

const RbacPage = () => {
    const { t } = useTranslation();
    const [section, setSection] = useState<Section>('serviceaccounts');
    const [search, setSearch] = useState('');
    const allowManage = canManageK8s(getStoredUser()!);
    const { errors, setFieldError, clearFieldError } = useInlineErrors();

    // SAs
    const [sas, setSas] = useState<K8sServiceAccountResponse[]>([]);
    const [saLoading, setSaLoading] = useState(false);
    const [saError, setSaError] = useState<string | null>(null);
    const [saCreateOpen, setSaCreateOpen] = useState(false);
    const [saForm, setSaForm] = useState({ name: '', labels: '' });
    const [saSaving, setSaSaving] = useState(false);
    const [saDeleteTarget, setSaDeleteTarget] = useState<K8sServiceAccountResponse | null>(null);

    // Roles
    const [roles, setRoles] = useState<K8sRoleResponse[]>([]);
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError, setRoleError] = useState<string | null>(null);
    const [showClusterRoles, setShowClusterRoles] = useState(false);
    const [roleCreateOpen, setRoleCreateOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({ name: '', isClusterRole: false, apiGroups: '', resources: '', verbs: '' });
    const [roleSaving, setRoleSaving] = useState(false);
    const [roleDeleteTarget, setRoleDeleteTarget] = useState<K8sRoleResponse | null>(null);

    // RoleBindings
    const [bindings, setBindings] = useState<K8sRoleBindingResponse[]>([]);

    // Pagination
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [bindingLoading, setBindingLoading] = useState(false);
    const [bindingError, setBindingError] = useState<string | null>(null);
    const [showClusterBindings, setShowClusterBindings] = useState(false);
    const [bindingCreateOpen, setBindingCreateOpen] = useState(false);
    const [bindingForm, setBindingForm] = useState({ name: '', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' });
    const [bindingSaving, setBindingSaving] = useState(false);
    const [bindingDeleteTarget, setBindingDeleteTarget] = useState<K8sRoleBindingResponse | null>(null);

    const loadSas = async (quiet = false) => {
        if (!quiet) setSaLoading(true);
        setSaError(null);
        try {
            const result = await k8sService.listServiceAccountsPaginated(page, PAGE_SIZE);
            setSas(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setSaError(getErrorMessage(e, 'Failed to load ServiceAccounts'));
        } finally { setSaLoading(false); }
    };

    const loadRoles = async (quiet = false) => {
        if (!quiet) setRoleLoading(true);
        setRoleError(null);
        try {
            const result = await k8sService.listRolesPaginated(page, PAGE_SIZE, showClusterRoles ? undefined : 'default', showClusterRoles);
            setRoles(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setRoleError(getErrorMessage(e, 'Failed to load roles'));
        } finally { setRoleLoading(false); }
    };

    const loadBindings = async (quiet = false) => {
        if (!quiet) setBindingLoading(true);
        setBindingError(null);
        try {
            const result = await k8sService.listRoleBindingsPaginated(page, PAGE_SIZE, showClusterBindings ? undefined : 'default', showClusterBindings);
            setBindings(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setBindingError(getErrorMessage(e, 'Failed to load role bindings'));
        } finally { setBindingLoading(false); }
    };

    useEffect(() => { if (section === 'serviceaccounts') loadSas(); }, [page, section]);
    useEffect(() => { if (section === 'roles') loadRoles(); }, [page, section, showClusterRoles]);
    useEffect(() => { if (section === 'rolebindings') loadBindings(); }, [page, section, showClusterBindings]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filteredSas = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sas;
        return sas.filter((sa) => [sa.name, sa.namespace].join(' ').toLowerCase().includes(q));
    }, [sas, search]);

    const filteredRoles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return roles;
        return roles.filter((r) => [r.name, r.namespace].join(' ').toLowerCase().includes(q));
    }, [roles, search]);

    const filteredBindings = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return bindings;
        return bindings.filter((b) => [b.name, b.namespace].join(' ').toLowerCase().includes(q));
    }, [bindings, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const loading = section === 'serviceaccounts' ? saLoading : section === 'roles' ? roleLoading : bindingLoading;
    const error = section === 'serviceaccounts' ? saError : section === 'roles' ? roleError : bindingError;

    const handleCreateSA = async () => {
        if (!saForm.name.trim()) {
            setFieldError('saName', t('k8s.rbac.nameRequired'));
            return;
        }
        setSaSaving(true);
        try {
            const labels = saForm.labels.trim() ? Object.fromEntries(saForm.labels.split(',').map((s) => { const [k, ...v] = s.trim().split('='); return [k, v.join('=')]; })) : undefined;
            await k8sService.createServiceAccount({ name: saForm.name.trim(), labels });
            toast.success(t('k8s.rbac.saCreated'));
            setSaCreateOpen(false);
            setSaForm({ name: '', labels: '' });
            clearFieldError('saName');
            await loadSas(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create ServiceAccount'));
        } finally { setSaSaving(false); }
    };

    const handleDeleteSA = async () => {
        if (!saDeleteTarget) return;
        try {
            await k8sService.deleteServiceAccount(saDeleteTarget.name, saDeleteTarget.namespace);
            toast.success(t('k8s.rbac.deletedToast'));
            setSaDeleteTarget(null);
            await loadSas(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete ServiceAccount'));
        }
    };

    const handleCreateRole = async () => {
        if (!roleForm.name.trim()) {
            setFieldError('roleName', t('k8s.rbac.nameRequired'));
            return;
        }
        setRoleSaving(true);
        try {
            const rule = {
                apiGroups: roleForm.apiGroups.trim() ? roleForm.apiGroups.split(',').map((s) => s.trim()) : [''],
                resources: roleForm.resources.trim() ? roleForm.resources.split(',').map((s) => s.trim()) : ['*'],
                verbs: roleForm.verbs.trim() ? roleForm.verbs.split(',').map((s) => s.trim()) : ['*'],
            };
            await k8sService.createRole({
                name: roleForm.name.trim(),
                isClusterRole: roleForm.isClusterRole,
                rules: [rule],
            });
            toast.success(t('k8s.rbac.roleCreated'));
            setRoleCreateOpen(false);
            setRoleForm({ name: '', isClusterRole: false, apiGroups: '', resources: '', verbs: '' });
            clearFieldError('roleName');
            await loadRoles(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create Role'));
        } finally { setRoleSaving(false); }
    };

    const handleDeleteRole = async () => {
        if (!roleDeleteTarget) return;
        try {
            await k8sService.deleteRole(roleDeleteTarget.name, roleDeleteTarget.isClusterRole, roleDeleteTarget.isClusterRole ? undefined : roleDeleteTarget.namespace);
            toast.success(t('k8s.rbac.deletedToast'));
            setRoleDeleteTarget(null);
            await loadRoles(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete Role'));
        }
    };

    const handleCreateBinding = async () => {
        if (!bindingForm.name.trim()) {
            setFieldError('bindingName', t('k8s.rbac.nameRequired'));
            return;
        }
        if (!bindingForm.roleName.trim()) {
            setFieldError('bindingRoleName', t('k8s.rbac.roleNameRequired'));
            return;
        }
        if (!bindingForm.subjName.trim()) {
            setFieldError('bindingSubjName', t('k8s.rbac.subjectRequired'));
            return;
        }
        setBindingSaving(true);
        try {
            const subjects: RoleBindingSubject[] = [{
                kind: bindingForm.subjKind || 'ServiceAccount',
                name: bindingForm.subjName.trim(),
                namespace: bindingForm.subjNamespace.trim() || undefined,
            }];
            await k8sService.createRoleBinding({
                name: bindingForm.name.trim(),
                isClusterBinding: bindingForm.isClusterBinding,
                roleKind: bindingForm.roleKind,
                roleName: bindingForm.roleName.trim(),
                subjects,
            });
            toast.success(t('k8s.rbac.bindingCreated'));
            setBindingCreateOpen(false);
            setBindingForm({ name: '', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' });
            clearFieldError('bindingName');
            clearFieldError('bindingRoleName');
            clearFieldError('bindingSubjName');
            await loadBindings(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create RoleBinding'));
        } finally { setBindingSaving(false); }
    };

    const handleDeleteBinding = async () => {
        if (!bindingDeleteTarget) return;
        try {
            await k8sService.deleteRoleBinding(bindingDeleteTarget.name, bindingDeleteTarget.isClusterBinding, bindingDeleteTarget.isClusterBinding ? undefined : bindingDeleteTarget.namespace);
            toast.success(t('k8s.rbac.deletedToast'));
            setBindingDeleteTarget(null);
            await loadBindings(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete RoleBinding'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.rbac.title')}</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>{t('k8s.rbac.subtitle')}</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('k8s.rbac.refresh')}><span><IconButton onClick={() => {
                        if (section === 'serviceaccounts') loadSas();
                        else if (section === 'roles') loadRoles();
                        else loadBindings();
                    }} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    {allowManage && section === 'serviceaccounts' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setSaForm({ name: '', labels: '' }); setSaCreateOpen(true); }} sx={{ px: 2.5 }}>{t('k8s.rbac.newSa')}</MyCustomButton>}
                    {allowManage && section === 'roles' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setRoleForm({ name: '', isClusterRole: false, apiGroups: '', resources: '', verbs: '' }); setRoleCreateOpen(true); }} sx={{ px: 2.5 }}>{t('k8s.rbac.newRole')}</MyCustomButton>}
                    {allowManage && section === 'rolebindings' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setBindingForm({ name: '', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' }); setBindingCreateOpen(true); }} sx={{ px: 2.5 }}>{t('k8s.rbac.newBinding')}</MyCustomButton>}
                </Box>
            </Box>

            {/* Section tabs */}
            <Paper sx={{ p: 0.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2, boxShadow: 'none' }}>
                <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, py: 0.5 }, '& .Mui-selected': { color: `${C.brand} !important` }, '& .MuiTabs-indicator': { backgroundColor: C.brand } }}>
                    <Tab value="serviceaccounts" label={<SectionTab value="serviceaccounts" label={t('k8s.rbac.serviceAccounts')} count={sas.length} icon={<GroupIcon sx={{ fontSize: 16 }} />} />} />
                    <Tab value="roles" label={<SectionTab value="roles" label={t('k8s.rbac.roles')} count={roles.length} icon={<SecurityIcon sx={{ fontSize: 16 }} />} />} />
                    <Tab value="rolebindings" label={<SectionTab value="rolebindings" label={t('k8s.rbac.bindings')} count={bindings.length} icon={<SecurityIcon sx={{ fontSize: 16 }} />} />} />
                </Tabs>
            </Paper>

            {/* Filters */}
            {(section !== 'roles' || !showClusterRoles) && (section !== 'rolebindings' || !showClusterBindings) && (
                <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                    <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('k8s.rbac.search')} sx={{ flex: 1, minWidth: 200 }}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>,
                                endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : undefined,
                            },
                        }} />
                    {section === 'roles' && (
                        <Chip label={showClusterRoles ? t('k8s.rbac.clusterRoles') : t('k8s.rbac.namespacedRoles')} onClick={() => setShowClusterRoles(!showClusterRoles)} color={showClusterRoles ? 'primary' : 'default'} size="small" sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    )}
                    {section === 'rolebindings' && (
                        <Chip label={showClusterBindings ? t('k8s.rbac.clusterRoleBindings') : t('k8s.rbac.namespacedBindings')} onClick={() => setShowClusterBindings(!showClusterBindings)} color={showClusterBindings ? 'primary' : 'default'} size="small" sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    )}
                </Paper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => { if (section === 'serviceaccounts') setSaError(null); else if (section === 'roles') setRoleError(null); else setBindingError(null); }}>{error}</Alert>}

            {/* Loading */}
            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}</Box>}

            {/* ServiceAccounts list */}
            {section === 'serviceaccounts' && !saLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filteredSas.length === 0 ? (
                        <Fade in><Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                            <GroupIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('k8s.rbac.noSas')}</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{t('k8s.rbac.noSaDesc')}</Typography>
                            {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setSaForm({ name: '', labels: '' }); setSaCreateOpen(true); }}>{t('k8s.rbac.newSa')}</MyCustomButton>}
                        </Card></Fade>
                    ) : (<>
                    {filteredSas.map((sa) => (
                        <Card key={sa.name + sa.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #BE185D, #9D174D)' }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <GroupIcon sx={{ color: '#BE185D', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{sa.name}</Typography>
                                            {sa.secretsCount > 0 && <Chip label={t('k8s.rbac.secrets', { count: sa.secretsCount })} size="small" sx={{ bgcolor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700, fontSize: 9, height: 20 }} />}
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{sa.namespace}</Typography>
                                        {sa.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 0.5 }}>{t('k8s.rbac.created')} {fmtDate(sa.createdAt)}</Typography>}
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                {allowManage && <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setSaDeleteTarget(sa)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                            </CardActions>
                        </Card>
                    ))}
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>)}
            </Box>
        )}

            {/* Roles list */}
            {section === 'roles' && !roleLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filteredRoles.length === 0 ? (
                        <Fade in><Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                            <SecurityIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('k8s.rbac.noRoles')}</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{t('k8s.rbac.noRoleDesc')}</Typography>
                            {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setRoleForm({ name: '', isClusterRole: false, apiGroups: '', resources: '', verbs: '' }); setRoleCreateOpen(true); }}>{t('k8s.rbac.newRole')}</MyCustomButton>}
                        </Card></Fade>
                    ) : (<>
                    {filteredRoles.map((r) => (
                        <Card key={r.name + (r.namespace || 'cluster')} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${r.isClusterRole ? '#9D174D' : '#BE185D'}, ${r.isClusterRole ? '#BE185D' : '#9D174D'})` }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <SecurityIcon sx={{ color: '#BE185D', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{r.name}</Typography>
                                            <Chip label={r.isClusterRole ? t('k8s.rbac.clusterRole') : t('k8s.rbac.role')} size="small" sx={{ bgcolor: r.isClusterRole ? '#F9D7E7' : '#FCE7F3', color: r.isClusterRole ? '#9D174D' : '#BE185D', fontWeight: 700, fontSize: 9, height: 20 }} />
                                            <Chip label={t('k8s.rbac.rules', { count: r.rulesCount })} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 700, fontSize: 9, height: 20 }} />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{r.isClusterRole ? t('k8s.rbac.clusterWide') : r.namespace}</Typography>
                                        {r.rulesSummary.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                                {r.rulesSummary.map((s, i) => <Chip key={i} label={s} size="small" variant="outlined" sx={{ fontSize: 9, fontFamily: 'monospace' }} />)}
                                            </Box>
                                        )}
                                        {r.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1 }}>{t('k8s.rbac.created')} {fmtDate(r.createdAt)}</Typography>}
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                {allowManage && <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setRoleDeleteTarget(r)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                            </CardActions>
                        </Card>
                    ))}
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                    </>)}
            </Box>
        )}

            {/* RoleBindings list */}
            {section === 'rolebindings' && !bindingLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filteredBindings.length === 0 ? (
                        <Fade in><Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                            <SecurityIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('k8s.rbac.noBindings')}</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{t('k8s.rbac.noBindingDesc')}</Typography>
                            {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setBindingForm({ name: '', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' }); setBindingCreateOpen(true); }}>{t('k8s.rbac.newBinding')}</MyCustomButton>}
                        </Card></Fade>
                    ) : (<>
                    {filteredBindings.map((b) => (
                        <Card key={b.name + (b.namespace || 'cluster')} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${b.isClusterBinding ? '#9D174D' : '#059669'}, ${b.roleRefKind === 'ClusterRole' ? '#9D174D' : '#BE185D'})` }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #D1FAE5, #FCE7F3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <SecurityIcon sx={{ color: '#BE185D', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{b.name}</Typography>
                                            <Chip label={b.isClusterBinding ? t('k8s.rbac.clusterRoleBindings') : t('k8s.rbac.bindings')} size="small" sx={{ bgcolor: b.isClusterBinding ? '#F9D7E7' : '#D1FAE5', color: b.isClusterBinding ? '#9D174D' : '#065F46', fontWeight: 700, fontSize: 9, height: 20 }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                            <Chip label={`${b.roleRefKind}: ${b.roleRefName}`} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 600, fontSize: 9, height: 20 }} />
                                            {b.subjectsSummary.map((s, i) => <Chip key={i} label={s} size="small" sx={{ bgcolor: '#E0F1E6', color: '#2E7A4F', fontSize: 9, height: 20 }} />)}
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.5 }}>{b.isClusterBinding ? t('k8s.rbac.clusterWide') : b.namespace}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                {allowManage && <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setBindingDeleteTarget(b)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                            </CardActions>
                        </Card>
                    ))}
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                    </>)}
            </Box>
        )}

            {/* SA Create Dialog */}
            <Dialog open={saCreateOpen} onClose={() => setSaCreateOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <GroupIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, color: C.text }}>{t('k8s.rbac.newSa')}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setSaCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField size="small" label={t('k8s.rbac.name')} value={saForm.name} onChange={(e) => { setSaForm((p) => ({ ...p, name: e.target.value })); clearFieldError('saName'); }} required error={Boolean(errors.saName)} helperText={errors.saName} />
                        <TextField size="small" label={t('k8s.rbac.labels')} value={saForm.labels} onChange={(e) => setSaForm((p) => ({ ...p, labels: e.target.value }))} placeholder="env=prod,team=backend" helperText={t('k8s.rbac.labelsHint')} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button variant="outlined" onClick={() => setSaCreateOpen(false)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={handleCreateSA} disabled={saSaving} sx={{ px: 3 }}>{saSaving ? t('k8s.rbac.creating') : t('common.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* SA Delete */}
            <Dialog open={!!saDeleteTarget} onClose={() => setSaDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('k8s.rbac.deleteSa')}
                </DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>{t('k8s.rbac.deleteSaConfirm', { name: saDeleteTarget?.name, namespace: saDeleteTarget?.namespace })}</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setSaDeleteTarget(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteSA} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>

            {/* Role Create Dialog */}
            <Dialog open={roleCreateOpen} onClose={() => setRoleCreateOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <SecurityIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, color: C.text }}>{t('k8s.rbac.newRole')}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setRoleCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField size="small" label={t('k8s.rbac.name')} value={roleForm.name} onChange={(e) => { setRoleForm((p) => ({ ...p, name: e.target.value })); clearFieldError('roleName'); }} required error={Boolean(errors.roleName)} helperText={errors.roleName} />
                        <Chip label={roleForm.isClusterRole ? t('k8s.rbac.clusterRole') : t('k8s.rbac.namespacedRoles')} color={roleForm.isClusterRole ? 'primary' : 'default'} size="small" onClick={() => setRoleForm((p) => ({ ...p, isClusterRole: !p.isClusterRole }))} sx={{ fontWeight: 700, cursor: 'pointer', width: 'fit-content' }} />
                        <TextField size="small" label={t('k8s.rbac.apiGroups')} value={roleForm.apiGroups} onChange={(e) => setRoleForm((p) => ({ ...p, apiGroups: e.target.value }))} placeholder='apps' helperText={t('k8s.rbac.apiGroupsHint')} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label={t('k8s.rbac.resources')} value={roleForm.resources} onChange={(e) => setRoleForm((p) => ({ ...p, resources: e.target.value }))} placeholder="pods,services" helperText={t('k8s.rbac.resourcesHint')} />
                            <TextField size="small" label={t('k8s.rbac.verbs')} value={roleForm.verbs} onChange={(e) => setRoleForm((p) => ({ ...p, verbs: e.target.value }))} placeholder="get,list,create" helperText={t('k8s.rbac.verbsHint')} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button variant="outlined" onClick={() => setRoleCreateOpen(false)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={handleCreateRole} disabled={roleSaving} sx={{ px: 3 }}>{roleSaving ? t('k8s.rbac.creating') : t('common.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Role Delete */}
            <Dialog open={!!roleDeleteTarget} onClose={() => setRoleDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('k8s.rbac.deleteRole')}
                </DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>{t('k8s.rbac.deleteRoleConfirm', { name: roleDeleteTarget?.name })}</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setRoleDeleteTarget(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteRole} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>

            {/* Binding Create Dialog */}
            <Dialog open={bindingCreateOpen} onClose={() => setBindingCreateOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <SecurityIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, color: C.text }}>{t('k8s.rbac.newBinding')}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setBindingCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField size="small" label={t('k8s.rbac.name')} value={bindingForm.name} onChange={(e) => { setBindingForm((p) => ({ ...p, name: e.target.value })); clearFieldError('bindingName'); }} required error={Boolean(errors.bindingName)} helperText={errors.bindingName} />
                        <Chip label={bindingForm.isClusterBinding ? t('k8s.rbac.clusterRoleBindings') : t('k8s.rbac.bindings')} color={bindingForm.isClusterBinding ? 'primary' : 'default'} size="small" onClick={() => setBindingForm((p) => ({ ...p, isClusterBinding: !p.isClusterBinding }))} sx={{ fontWeight: 700, cursor: 'pointer', width: 'fit-content' }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" select label={t('k8s.rbac.roleKind')} value={bindingForm.roleKind} onChange={(e) => setBindingForm((p) => ({ ...p, roleKind: e.target.value }))}>
                                <MenuItem value="Role">{t('k8s.rbac.role')}</MenuItem>
                                <MenuItem value="ClusterRole">{t('k8s.rbac.clusterRole')}</MenuItem>
                            </TextField>
                            <TextField size="small" label={t('k8s.rbac.roleName')} value={bindingForm.roleName} onChange={(e) => { setBindingForm((p) => ({ ...p, roleName: e.target.value })); clearFieldError('bindingRoleName'); }} required error={Boolean(errors.bindingRoleName)} helperText={errors.bindingRoleName} />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t('k8s.rbac.subject')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" select label={t('k8s.rbac.kind')} value={bindingForm.subjKind} onChange={(e) => setBindingForm((p) => ({ ...p, subjKind: e.target.value }))}>
                                <MenuItem value="ServiceAccount">{t('k8s.rbac.serviceAccounts')}</MenuItem>
                                <MenuItem value="User">User</MenuItem>
                                <MenuItem value="Group">Group</MenuItem>
                            </TextField>
                            <TextField size="small" label={t('k8s.rbac.name')} value={bindingForm.subjName} onChange={(e) => { setBindingForm((p) => ({ ...p, subjName: e.target.value })); clearFieldError('bindingSubjName'); }} required error={Boolean(errors.bindingSubjName)} helperText={errors.bindingSubjName} />
                            <TextField size="small" label={t('k8s.rbac.subjectNamespace')} value={bindingForm.subjNamespace} onChange={(e) => setBindingForm((p) => ({ ...p, subjNamespace: e.target.value }))} placeholder={t('k8s.rbac.optional')} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button variant="outlined" onClick={() => setBindingCreateOpen(false)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={handleCreateBinding} disabled={bindingSaving} sx={{ px: 3 }}>{bindingSaving ? t('k8s.rbac.creating') : t('common.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Binding Delete */}
            <Dialog open={!!bindingDeleteTarget} onClose={() => setBindingDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('k8s.rbac.deleteBinding')}
                </DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>{t('k8s.rbac.deleteBindingConfirm', { name: bindingDeleteTarget?.name })}</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setBindingDeleteTarget(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteBinding} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RbacPage;
