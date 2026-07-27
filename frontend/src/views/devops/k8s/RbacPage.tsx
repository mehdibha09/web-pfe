import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Group as GroupIcon, Refresh as RefreshIcon, Search as SearchIcon, Security as SecurityIcon } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, CardActions, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper, Skeleton, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { k8sService } from '../../../services/k8sService';
import type { K8sRoleBindingRequest, K8sRoleRequest, K8sServiceAccountRequest, K8sServiceAccountResponse, K8sRoleResponse, K8sRoleBindingResponse, RoleBindingSubject } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';

type Section = 'serviceaccounts' | 'roles' | 'rolebindings';

const SectionTab = ({ value, label, count, icon }: { value: Section; label: string; count: number; icon: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1 }}>
        {icon}
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
        <Chip label={count} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#E4EEF7', color: '#2E5C8A' }} />
    </Box>
);

const RbacPage = () => {
    const [section, setSection] = useState<Section>('serviceaccounts');
    const [search, setSearch] = useState('');
    const [namespaceFilter, setNamespaceFilter] = useState('');

    // SAs
    const [sas, setSas] = useState<K8sServiceAccountResponse[]>([]);
    const [saLoading, setSaLoading] = useState(false);
    const [saError, setSaError] = useState<string | null>(null);
    const [saCreateOpen, setSaCreateOpen] = useState(false);
    const [saForm, setSaForm] = useState({ name: '', namespace: 'default', labels: '' });
    const [saSaving, setSaSaving] = useState(false);
    const [saDeleteTarget, setSaDeleteTarget] = useState<K8sServiceAccountResponse | null>(null);

    // Roles
    const [roles, setRoles] = useState<K8sRoleResponse[]>([]);
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError, setRoleError] = useState<string | null>(null);
    const [showClusterRoles, setShowClusterRoles] = useState(false);
    const [roleCreateOpen, setRoleCreateOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({ name: '', namespace: 'default', isClusterRole: false, apiGroups: '', resources: '', verbs: '' });
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
    const [bindingForm, setBindingForm] = useState({ name: '', namespace: 'default', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' });
    const [bindingSaving, setBindingSaving] = useState(false);
    const [bindingDeleteTarget, setBindingDeleteTarget] = useState<K8sRoleBindingResponse | null>(null);

    const loadSas = async (quiet = false) => {
        if (!quiet) setSaLoading(true);
        setSaError(null);
        try {
            const result = await k8sService.listServiceAccountsPaginated(page, PAGE_SIZE, namespaceFilter || undefined);
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
            const result = await k8sService.listRolesPaginated(page, PAGE_SIZE, showClusterRoles ? undefined : namespaceFilter || 'default', showClusterRoles);
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
            const result = await k8sService.listRoleBindingsPaginated(page, PAGE_SIZE, showClusterBindings ? undefined : namespaceFilter || 'default', showClusterBindings);
            setBindings(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setBindingError(getErrorMessage(e, 'Failed to load role bindings'));
        } finally { setBindingLoading(false); }
    };

    useEffect(() => { if (section === 'serviceaccounts') loadSas(); }, [page, section, namespaceFilter]);
    useEffect(() => { if (section === 'roles') loadRoles(); }, [page, section, showClusterRoles, namespaceFilter]);
    useEffect(() => { if (section === 'rolebindings') loadBindings(); }, [page, section, showClusterBindings, namespaceFilter]);

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
        if (!saForm.name.trim()) return toast.error('Name is required');
        setSaSaving(true);
        try {
            const labels = saForm.labels.trim() ? Object.fromEntries(saForm.labels.split(',').map((s) => { const [k, ...v] = s.trim().split('='); return [k, v.join('=')]; })) : undefined;
            await k8sService.createServiceAccount({ name: saForm.name.trim(), namespace: saForm.namespace.trim() || 'default', labels });
            toast.success('ServiceAccount created');
            setSaCreateOpen(false);
            setSaForm({ name: '', namespace: 'default', labels: '' });
            await loadSas(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create ServiceAccount'));
        } finally { setSaSaving(false); }
    };

    const handleDeleteSA = async () => {
        if (!saDeleteTarget) return;
        try {
            await k8sService.deleteServiceAccount(saDeleteTarget.name, saDeleteTarget.namespace);
            toast.success('ServiceAccount deleted');
            setSaDeleteTarget(null);
            await loadSas(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete ServiceAccount'));
        }
    };

    const handleCreateRole = async () => {
        if (!roleForm.name.trim()) return toast.error('Name is required');
        setRoleSaving(true);
        try {
            const rule = {
                apiGroups: roleForm.apiGroups.trim() ? roleForm.apiGroups.split(',').map((s) => s.trim()) : [''],
                resources: roleForm.resources.trim() ? roleForm.resources.split(',').map((s) => s.trim()) : ['*'],
                verbs: roleForm.verbs.trim() ? roleForm.verbs.split(',').map((s) => s.trim()) : ['*'],
            };
            await k8sService.createRole({
                name: roleForm.name.trim(),
                namespace: roleForm.isClusterRole ? undefined : (roleForm.namespace.trim() || 'default'),
                isClusterRole: roleForm.isClusterRole,
                rules: [rule],
            });
            toast.success('Role created');
            setRoleCreateOpen(false);
            setRoleForm({ name: '', namespace: 'default', isClusterRole: false, apiGroups: '', resources: '', verbs: '' });
            await loadRoles(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create Role'));
        } finally { setRoleSaving(false); }
    };

    const handleDeleteRole = async () => {
        if (!roleDeleteTarget) return;
        try {
            await k8sService.deleteRole(roleDeleteTarget.name, roleDeleteTarget.isClusterRole, roleDeleteTarget.isClusterRole ? undefined : roleDeleteTarget.namespace);
            toast.success('Role deleted');
            setRoleDeleteTarget(null);
            await loadRoles(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete Role'));
        }
    };

    const handleCreateBinding = async () => {
        if (!bindingForm.name.trim() || !bindingForm.roleName.trim() || !bindingForm.subjName.trim()) return toast.error('Name, Role and Subject are required');
        setBindingSaving(true);
        try {
            const subjects: RoleBindingSubject[] = [{
                kind: bindingForm.subjKind || 'ServiceAccount',
                name: bindingForm.subjName.trim(),
                namespace: bindingForm.subjNamespace.trim() || undefined,
            }];
            await k8sService.createRoleBinding({
                name: bindingForm.name.trim(),
                namespace: bindingForm.isClusterBinding ? undefined : (bindingForm.namespace.trim() || 'default'),
                isClusterBinding: bindingForm.isClusterBinding,
                roleKind: bindingForm.roleKind,
                roleName: bindingForm.roleName.trim(),
                subjects,
            });
            toast.success('RoleBinding created');
            setBindingCreateOpen(false);
            setBindingForm({ name: '', namespace: 'default', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' });
            await loadBindings(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create RoleBinding'));
        } finally { setBindingSaving(false); }
    };

    const handleDeleteBinding = async () => {
        if (!bindingDeleteTarget) return;
        try {
            await k8sService.deleteRoleBinding(bindingDeleteTarget.name, bindingDeleteTarget.isClusterBinding, bindingDeleteTarget.isClusterBinding ? undefined : bindingDeleteTarget.namespace);
            toast.success('RoleBinding deleted');
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
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>RBAC</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>Role-based access control — ServiceAccounts, Roles & Bindings</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh"><span><IconButton onClick={() => {
                        if (section === 'serviceaccounts') loadSas();
                        else if (section === 'roles') loadRoles();
                        else loadBindings();
                    }} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    {section === 'serviceaccounts' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setSaForm({ name: '', namespace: 'default', labels: '' }); setSaCreateOpen(true); }} sx={{ px: 2.5 }}>New SA</MyCustomButton>}
                    {section === 'roles' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setRoleForm({ name: '', namespace: 'default', isClusterRole: false, apiGroups: '', resources: '', verbs: '' }); setRoleCreateOpen(true); }} sx={{ px: 2.5 }}>New Role</MyCustomButton>}
                    {section === 'rolebindings' && <MyCustomButton startIcon={<AddIcon />} onClick={() => { setBindingForm({ name: '', namespace: 'default', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' }); setBindingCreateOpen(true); }} sx={{ px: 2.5 }}>New Binding</MyCustomButton>}
                </Box>
            </Box>

            {/* Section tabs */}
            <Paper sx={{ p: 0.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2, boxShadow: 'none' }}>
                <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, py: 0.5 }, '& .Mui-selected': { color: `${C.brand} !important` }, '& .MuiTabs-indicator': { backgroundColor: C.brand } }}>
                    <Tab value="serviceaccounts" label={<SectionTab value="serviceaccounts" label="Service Accounts" count={sas.length} icon={<GroupIcon sx={{ fontSize: 16 }} />} />} />
                    <Tab value="roles" label={<SectionTab value="roles" label="Roles" count={roles.length} icon={<SecurityIcon sx={{ fontSize: 16 }} />} />} />
                    <Tab value="rolebindings" label={<SectionTab value="rolebindings" label="Bindings" count={bindings.length} icon={<SecurityIcon sx={{ fontSize: 16 }} />} />} />
                </Tabs>
            </Paper>

            {/* Filters */}
            {(section !== 'roles' || !showClusterRoles) && (section !== 'rolebindings' || !showClusterBindings) && (
                <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                    <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." sx={{ flex: 1, minWidth: 200 }}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>,
                                endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : undefined,
                            },
                        }} />
                    {section === 'roles' && (
                        <Chip label={showClusterRoles ? 'ClusterRoles' : 'Namespaced Roles'} onClick={() => setShowClusterRoles(!showClusterRoles)} color={showClusterRoles ? 'primary' : 'default'} size="small" sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    )}
                    {section === 'rolebindings' && (
                        <Chip label={showClusterBindings ? 'ClusterRoleBindings' : 'Namespaced Bindings'} onClick={() => setShowClusterBindings(!showClusterBindings)} color={showClusterBindings ? 'primary' : 'default'} size="small" sx={{ fontWeight: 700, cursor: 'pointer' }} />
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>No ServiceAccounts</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>Create your first ServiceAccount for pod identity</Typography>
                            <MyCustomButton startIcon={<AddIcon />} onClick={() => { setSaForm({ name: '', namespace: 'default', labels: '' }); setSaCreateOpen(true); }}>New ServiceAccount</MyCustomButton>
                        </Card></Fade>
                    ) : (<>
                    {filteredSas.map((sa) => (
                        <Card key={sa.name + sa.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #2563EB, #7C3AED)' }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #DBEAFE, #E9D5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <GroupIcon sx={{ color: '#4F46E5', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{sa.name}</Typography>
                                            {sa.secretsCount > 0 && <Chip label={`${sa.secretsCount} secrets`} size="small" sx={{ bgcolor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700, fontSize: 9, height: 20 }} />}
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{sa.namespace}</Typography>
                                        {sa.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 0.5 }}>Created {fmtDate(sa.createdAt)}</Typography>}
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => setSaDeleteTarget(sa)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>No Roles</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>Create your first Role to define permissions</Typography>
                            <MyCustomButton startIcon={<AddIcon />} onClick={() => { setRoleForm({ name: '', namespace: 'default', isClusterRole: false, apiGroups: '', resources: '', verbs: '' }); setRoleCreateOpen(true); }}>New Role</MyCustomButton>
                        </Card></Fade>
                    ) : (<>
                    {filteredRoles.map((r) => (
                        <Card key={r.name + (r.namespace || 'cluster')} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${r.isClusterRole ? '#7C3AED' : '#2563EB'}, ${r.isClusterRole ? '#2563EB' : '#7C3AED'})` }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #DBEAFE, #E9D5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <SecurityIcon sx={{ color: '#4F46E5', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{r.name}</Typography>
                                            <Chip label={r.isClusterRole ? 'ClusterRole' : 'Role'} size="small" sx={{ bgcolor: r.isClusterRole ? '#E9D5FF' : '#DBEAFE', color: r.isClusterRole ? '#6B21A8' : '#1E40AF', fontWeight: 700, fontSize: 9, height: 20 }} />
                                            <Chip label={`${r.rulesCount} rules`} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 700, fontSize: 9, height: 20 }} />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{r.isClusterRole ? '(cluster-wide)' : r.namespace}</Typography>
                                        {r.rulesSummary.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                                {r.rulesSummary.map((s, i) => <Chip key={i} label={s} size="small" variant="outlined" sx={{ fontSize: 9, fontFamily: 'monospace' }} />)}
                                            </Box>
                                        )}
                                        {r.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1 }}>Created {fmtDate(r.createdAt)}</Typography>}
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => setRoleDeleteTarget(r)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>No Bindings</Typography>
                            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>Bind a Role to a ServiceAccount</Typography>
                            <MyCustomButton startIcon={<AddIcon />} onClick={() => { setBindingForm({ name: '', namespace: 'default', isClusterBinding: false, roleKind: 'Role', roleName: '', subjKind: 'ServiceAccount', subjName: '', subjNamespace: '' }); setBindingCreateOpen(true); }}>New Binding</MyCustomButton>
                        </Card></Fade>
                    ) : (<>
                    {filteredBindings.map((b) => (
                        <Card key={b.name + (b.namespace || 'cluster')} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', '&:hover': { borderColor: '#C8D0DC' } }}>
                            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${b.isClusterBinding ? '#7C3AED' : '#059669'}, ${b.roleRefKind === 'ClusterRole' ? '#7C3AED' : '#2563EB'})` }} />
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #D1FAE5, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <SecurityIcon sx={{ color: '#4F46E5', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{b.name}</Typography>
                                            <Chip label={b.isClusterBinding ? 'ClusterRoleBinding' : 'RoleBinding'} size="small" sx={{ bgcolor: b.isClusterBinding ? '#E9D5FF' : '#D1FAE5', color: b.isClusterBinding ? '#6B21A8' : '#065F46', fontWeight: 700, fontSize: 9, height: 20 }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                            <Chip label={`${b.roleRefKind}: ${b.roleRefName}`} size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 600, fontSize: 9, height: 20 }} />
                                            {b.subjectsSummary.map((s, i) => <Chip key={i} label={s} size="small" sx={{ bgcolor: '#E0F1E6', color: '#2E7A4F', fontSize: 9, height: 20 }} />)}
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.5 }}>{b.isClusterBinding ? '(cluster-wide)' : b.namespace}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA' }}>
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => setBindingDeleteTarget(b)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                            </CardActions>
                        </Card>
                    ))}
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                    </>)}
            </Box>
        )}

            {/* SA Create Dialog */}
            <Dialog open={saCreateOpen} onClose={() => setSaCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><GroupIcon sx={{ color: '#4F46E5', fontSize: 20 }} /> New ServiceAccount</Box>
                    <IconButton size="small" onClick={() => setSaCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Name" value={saForm.name} onChange={(e) => setSaForm((p) => ({ ...p, name: e.target.value }))} required />
                            <TextField size="small" label="Namespace" value={saForm.namespace} onChange={(e) => setSaForm((p) => ({ ...p, namespace: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Labels" value={saForm.labels} onChange={(e) => setSaForm((p) => ({ ...p, labels: e.target.value }))} placeholder="env=prod,team=backend" helperText="Comma-separated key=value" />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setSaCreateOpen(false)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <MyCustomButton onClick={handleCreateSA} disabled={saSaving} sx={{ px: 3 }}>{saSaving ? 'Creating...' : 'Create'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* SA Delete */}
            <Dialog open={!!saDeleteTarget} onClose={() => setSaDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete ServiceAccount</DialogTitle>
                <DialogContent><Typography>Delete <strong>{saDeleteTarget?.name}</strong> in <strong>{saDeleteTarget?.namespace}</strong>?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setSaDeleteTarget(null)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteSA} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Role Create Dialog */}
            <Dialog open={roleCreateOpen} onClose={() => setRoleCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SecurityIcon sx={{ color: '#4F46E5', fontSize: 20 }} /> New Role</Box>
                    <IconButton size="small" onClick={() => setRoleCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Name" value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} required />
                            <TextField size="small" label="Namespace" value={roleForm.namespace} onChange={(e) => setRoleForm((p) => ({ ...p, namespace: e.target.value }))} disabled={roleForm.isClusterRole} helperText={roleForm.isClusterRole ? 'N/A for ClusterRole' : ''} />
                        </Box>
                        <Chip label={roleForm.isClusterRole ? 'ClusterRole' : 'Namespaced Role'} color={roleForm.isClusterRole ? 'primary' : 'default'} size="small" onClick={() => setRoleForm((p) => ({ ...p, isClusterRole: !p.isClusterRole }))} sx={{ fontWeight: 700, cursor: 'pointer', width: 'fit-content' }} />
                        <TextField size="small" label="API Groups" value={roleForm.apiGroups} onChange={(e) => setRoleForm((p) => ({ ...p, apiGroups: e.target.value }))} placeholder='apps' helperText="Comma-separated (empty = core group)" />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Resources" value={roleForm.resources} onChange={(e) => setRoleForm((p) => ({ ...p, resources: e.target.value }))} placeholder="pods,services" helperText="Comma-separated" />
                            <TextField size="small" label="Verbs" value={roleForm.verbs} onChange={(e) => setRoleForm((p) => ({ ...p, verbs: e.target.value }))} placeholder="get,list,create" helperText="Comma-separated" />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setRoleCreateOpen(false)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <MyCustomButton onClick={handleCreateRole} disabled={roleSaving} sx={{ px: 3 }}>{roleSaving ? 'Creating...' : 'Create'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Role Delete */}
            <Dialog open={!!roleDeleteTarget} onClose={() => setRoleDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Role</DialogTitle>
                <DialogContent><Typography>Delete <strong>{roleDeleteTarget?.name}</strong>?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setRoleDeleteTarget(null)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteRole} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Binding Create Dialog */}
            <Dialog open={bindingCreateOpen} onClose={() => setBindingCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SecurityIcon sx={{ color: '#4F46E5', fontSize: 20 }} /> New Binding</Box>
                    <IconButton size="small" onClick={() => setBindingCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Name" value={bindingForm.name} onChange={(e) => setBindingForm((p) => ({ ...p, name: e.target.value }))} required />
                            <TextField size="small" label="Namespace" value={bindingForm.namespace} onChange={(e) => setBindingForm((p) => ({ ...p, namespace: e.target.value }))} disabled={bindingForm.isClusterBinding} helperText={bindingForm.isClusterBinding ? 'N/A' : ''} />
                        </Box>
                        <Chip label={bindingForm.isClusterBinding ? 'ClusterRoleBinding' : 'RoleBinding'} color={bindingForm.isClusterBinding ? 'primary' : 'default'} size="small" onClick={() => setBindingForm((p) => ({ ...p, isClusterBinding: !p.isClusterBinding }))} sx={{ fontWeight: 700, cursor: 'pointer', width: 'fit-content' }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" select label="Role Kind" value={bindingForm.roleKind} onChange={(e) => setBindingForm((p) => ({ ...p, roleKind: e.target.value }))}>
                                <MenuItem value="Role">Role</MenuItem>
                                <MenuItem value="ClusterRole">ClusterRole</MenuItem>
                            </TextField>
                            <TextField size="small" label="Role Name" value={bindingForm.roleName} onChange={(e) => setBindingForm((p) => ({ ...p, roleName: e.target.value }))} required />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>Subject</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" select label="Kind" value={bindingForm.subjKind} onChange={(e) => setBindingForm((p) => ({ ...p, subjKind: e.target.value }))}>
                                <MenuItem value="ServiceAccount">ServiceAccount</MenuItem>
                                <MenuItem value="User">User</MenuItem>
                                <MenuItem value="Group">Group</MenuItem>
                            </TextField>
                            <TextField size="small" label="Name" value={bindingForm.subjName} onChange={(e) => setBindingForm((p) => ({ ...p, subjName: e.target.value }))} required />
                            <TextField size="small" label="Namespace" value={bindingForm.subjNamespace} onChange={(e) => setBindingForm((p) => ({ ...p, subjNamespace: e.target.value }))} placeholder="(optional)" />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setBindingCreateOpen(false)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <MyCustomButton onClick={handleCreateBinding} disabled={bindingSaving} sx={{ px: 3 }}>{bindingSaving ? 'Creating...' : 'Create'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Binding Delete */}
            <Dialog open={!!bindingDeleteTarget} onClose={() => setBindingDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Binding</DialogTitle>
                <DialogContent><Typography>Delete <strong>{bindingDeleteTarget?.name}</strong>?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setBindingDeleteTarget(null)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteBinding} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RbacPage;
