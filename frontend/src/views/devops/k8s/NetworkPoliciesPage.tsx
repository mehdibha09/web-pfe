import {
    Add as AddIcon, ArrowDownward as ArrowDownIcon, ArrowUpward as ArrowUpIcon,
    Close as CloseIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
    Search as SearchIcon, Shield as ShieldIcon
} from '@mui/icons-material';
import {
    Alert, Box, Button, Card, CardContent, CardActions, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper,
    Skeleton, TextField, Tooltip, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { K8sNetworkPolicyRequest, K8sNetworkPolicyResponse, NetworkPolicyRule } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    Ingress: { bg: '#E4EEF7', fg: '#2E5C8A' },
    Egress: { bg: '#E9E6F6', fg: '#5E4B9E' }
};

const NetworkPoliciesPage = () => {
    const { t } = useTranslation();
    const [policies, setPolicies] = useState<K8sNetworkPolicyResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [namespaceFilter, setNamespaceFilter] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ name: '', namespace: 'default', podSelector: '', types: ['Ingress'] as string[], ports: '', ipBlocks: '' });
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<K8sNetworkPolicyResponse | null>(null);
    const [detailPolicy, setDetailPolicy] = useState<K8sNetworkPolicyResponse | null>(null);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const result = await k8sService.listNetworkPoliciesPaginated(page, PAGE_SIZE, namespaceFilter || undefined);
            setPolicies(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load network policies'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page, namespaceFilter]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return policies;
        return policies.filter((p) =>
            [p.name, p.namespace, p.podSelector, ...p.policyTypes].join(' ').toLowerCase().includes(q)
        );
    }, [policies, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const kpis = useMemo(() => {
        const total = totalElements;
        const ingressOnly = policies.filter((p) => p.policyTypes.length === 1 && p.policyTypes[0] === 'Ingress').length;
        const egressOnly = policies.filter((p) => p.policyTypes.length === 1 && p.policyTypes[0] === 'Egress').length;
        const both = policies.filter((p) => p.policyTypes.length > 1).length;
        return { total, ingressOnly, egressOnly, both };
    }, [policies, totalElements]);

    const namespaces = useMemo(() => [...new Set(policies.map((p) => p.namespace))], [policies]);

    const resetForm = () => setForm({ name: '', namespace: 'default', podSelector: '', types: ['Ingress'], ports: '', ipBlocks: '' });

    const handleCreate = async () => {
        if (!form.name.trim()) return toast.error('Name is required');
        setSaving(true);
        try {
            const hasRules = form.ports.trim() || form.ipBlocks.trim();
            const ingressRule: NetworkPolicyRule[] = hasRules && form.types.includes('Ingress') ? [{
                ipBlocks: form.ipBlocks.trim() ? form.ipBlocks.split(',').map((s) => s.trim()) : undefined,
                ports: form.ports.trim() ? form.ports.split(',').map((s) => s.trim()) : undefined
            }] : [];
            const egressRule: NetworkPolicyRule[] = hasRules && form.types.includes('Egress') ? [{
                ipBlocks: form.ipBlocks.trim() ? form.ipBlocks.split(',').map((s) => s.trim()) : undefined,
                ports: form.ports.trim() ? form.ports.split(',').map((s) => s.trim()) : undefined
            }] : [];

            await k8sService.createNetworkPolicy({
                name: form.name.trim(), namespace: form.namespace.trim() || 'default',
                podSelectorLabels: form.podSelector.trim() || undefined,
                policyTypes: form.types,
                ingressRules: ingressRule.length > 0 ? ingressRule : undefined,
                egressRules: egressRule.length > 0 ? egressRule : undefined
            });
            toast.success(`Policy "${form.name}" created`);
            setCreateOpen(false);
            resetForm();
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create policy'));
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.deleteNetworkPolicy(deleteTarget.name, deleteTarget.namespace);
            toast.success('Policy deleted');
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete policy'));
        }
    };

    const KpiCard = ({ label, value, bg, fg, icon }: { label: string; value: number; bg: string; fg: string; icon: React.ReactNode }) => (
        <Paper sx={{ p: 2, borderRadius: 3, bg, border: `1px solid ${fg}22`, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: 'none' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>{icon}</Box>
            <Box><Typography sx={{ color: fg, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography><Typography sx={{ color: fg, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{value}</Typography></Box>
        </Paper>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>Network Policies</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>Kubernetes network traffic rules</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}><span><IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateOpen(true); }} sx={{ px: 2.5 }}>New Policy</MyCustomButton>
                </Box>
            </Box>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 3 }}>
                <KpiCard label="Total" value={kpis.total} bg="#F8FAFC" fg="#475569" icon={<ShieldIcon sx={{ fontSize: 16 }} />} />
                <KpiCard label="Ingress Only" value={kpis.ingressOnly} bg="#EFF6FF" fg="#2563EB" icon={<ArrowDownIcon sx={{ fontSize: 16 }} />} />
                <KpiCard label="Egress Only" value={kpis.egressOnly} bg="#FAF5FF" fg="#7C3AED" icon={<ArrowUpIcon sx={{ fontSize: 16 }} />} />
                <KpiCard label="Both" value={kpis.both} bg="#F0FDF4" fg="#16A34A" icon={<ShieldIcon sx={{ fontSize: 16 }} />} />
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." sx={{ flex: 1, minWidth: 200 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : null } }} />
                <TextField size="small" select value={namespaceFilter} onChange={(e) => setNamespaceFilter(e.target.value)} sx={{ minWidth: 160 }}
                    slotProps={{ select: { displayEmpty: true } }}>
                    <MenuItem value="">All namespaces</MenuItem>
                    {namespaces.map((ns) => <MenuItem key={ns} value={ns}>{ns}</MenuItem>)}
                </TextField>
                <Chip label={`${filtered.length} / ${totalElements}`} size="small" sx={{ backgroundColor: '#E4EEF7', color: '#2E5C8A', fontWeight: 700, fontSize: 12 }} />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Loading */}
            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 3 }} />)}</Box>}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <ShieldIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{namespaceFilter ? `No policies in "${namespaceFilter}"` : 'No network policies'}</Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{namespaceFilter ? 'Try a different namespace' : 'Create your first network policy to control pod traffic'}</Typography>
                        {!namespaceFilter && <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateOpen(true); }}>New Policy</MyCustomButton>}
                    </Card>
                </Fade>
            )}

            {/* Policy cards */}
            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filtered.map((p) => {
                        const isExpanded = detailPolicy?.name === p.name && detailPolicy?.namespace === p.namespace;
                        return (
                            <Card key={p.name + p.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: '#fff', transition: 'all 0.15s ease', '&:hover': { borderColor: '#C8D0DC' } }}>
                                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${TYPE_COLORS.Ingress.fg}, ${p.policyTypes.includes('Egress') ? TYPE_COLORS.Egress.fg : TYPE_COLORS.Ingress.fg})` }} />
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #E4EEF7, #E9E6F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <ShieldIcon sx={{ color: '#4F46E5', fontSize: 18 }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{p.name}</Typography>
                                                {p.policyTypes.map((t) => {
                                                    const tc = TYPE_COLORS[t] || { bg: '#F3F4F6', fg: '#374151' };
                                                    return <Chip key={t} label={t} size="small" sx={{ backgroundColor: tc.bg, color: tc.fg, fontWeight: 700, fontSize: 9, height: 20 }} />;
                                                })}
                                            </Box>
                                            <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>
                                                {p.namespace}{p.podSelector ? ` › pods: ${p.podSelector}` : ' › all pods'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        {/* Ingress rules */}
                                        {p.ingressRules.length > 0 ? (
                                            <Paper sx={{ flex: 1, minWidth: 200, p: 1.25, borderRadius: 2, bg: '#F8FAFC', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ArrowDownIcon sx={{ fontSize: 12 }} /> Ingress Rules
                                                </Typography>
                                                {p.ingressRules.map((r, i) => (
                                                    <Typography key={i} sx={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', lineHeight: 1.5 }}>{r || '(allow all)'}</Typography>
                                                ))}
                                            </Paper>
                                        ) : p.policyTypes.includes('Ingress') && (
                                            <Paper sx={{ flex: 1, minWidth: 200, p: 1.25, borderRadius: 2, bg: '#FFF7ED', border: '1px solid #FED7AA', boxShadow: 'none' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ArrowDownIcon sx={{ fontSize: 12 }} /> Ingress — blocked (no rules)
                                                </Typography>
                                            </Paper>
                                        )}

                                        {/* Egress rules */}
                                        {p.egressRules.length > 0 ? (
                                            <Paper sx={{ flex: 1, minWidth: 200, p: 1.25, borderRadius: 2, bg: '#F8FAFC', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ArrowUpIcon sx={{ fontSize: 12 }} /> Egress Rules
                                                </Typography>
                                                {p.egressRules.map((r, i) => (
                                                    <Typography key={i} sx={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', lineHeight: 1.5 }}>{r || '(allow all)'}</Typography>
                                                ))}
                                            </Paper>
                                        ) : p.policyTypes.includes('Egress') && (
                                            <Paper sx={{ flex: 1, minWidth: 200, p: 1.25, borderRadius: 2, bg: '#FFF7ED', border: '1px solid #FED7AA', boxShadow: 'none' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ArrowUpIcon sx={{ fontSize: 12 }} /> Egress — blocked (no rules)
                                                </Typography>
                                            </Paper>
                                        )}
                                    </Box>

                                    {p.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1.5 }}>Created {fmtDate(p.createdAt)}</Typography>}
                                </CardContent>
                                <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA', gap: 0.5 }}>
                                    <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(p)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </CardActions>
                            </Card>
                        );
                    })}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShieldIcon sx={{ color: '#4F46E5', fontSize: 20 }} /> New Network Policy</Box>
                    <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                            <TextField size="small" label="Namespace" value={form.namespace} onChange={(e) => setForm((p) => ({ ...p, namespace: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Pod Selector" value={form.podSelector} onChange={(e) => setForm((p) => ({ ...p, podSelector: e.target.value }))} placeholder="app=web,version=v1" helperText="Leave empty to target all pods" />
                        <TextField size="small" select label="Policy Types" value={form.types} onChange={(e) => setForm((p) => ({ ...p, types: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))} slotProps={{ select: { multiple: true } }}>
                            <MenuItem value="Ingress">Ingress (incoming traffic)</MenuItem>
                            <MenuItem value="Egress">Egress (outgoing traffic)</MenuItem>
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Allowed Ports" value={form.ports} onChange={(e) => setForm((p) => ({ ...p, ports: e.target.value }))} placeholder="80,443,8080" helperText="Comma-separated" />
                            <TextField size="small" label="Allowed CIDRs" value={form.ipBlocks} onChange={(e) => setForm((p) => ({ ...p, ipBlocks: e.target.value }))} placeholder="10.0.0.0/8" helperText="Comma-separated" />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setCreateOpen(false)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <MyCustomButton onClick={handleCreate} disabled={saving} sx={{ px: 3 }}>{saving ? 'Creating...' : 'Create Policy'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Network Policy</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: C.muted }}>Are you sure you want to delete <strong>{deleteTarget?.name}</strong> in namespace <strong>{deleteTarget?.namespace}</strong>?</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NetworkPoliciesPage;
