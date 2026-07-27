import { Add as AddIcon, Close as CloseIcon, ContentCopy, Delete as DeleteIcon, Lock as LockIcon, Refresh as RefreshIcon, Save as SaveIcon, Search as SearchIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { k8sService } from '../../../services/k8sService';
import type { K8sSecretResponse } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';

const SECRET_TYPES = ['Opaque', 'kubernetes.io/tls', 'kubernetes.io/dockerconfigjson', 'kubernetes.io/service-account-token', 'kubernetes.io/basic-auth', 'kubernetes.io/ssh-auth'];

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    'Opaque': { bg: '#F3F4F6', fg: '#374151' },
    'kubernetes.io/tls': { bg: '#E4EEF7', fg: '#2E5C8A' },
    'kubernetes.io/dockerconfigjson': { bg: '#E9E6F6', fg: '#5E4B9E' },
    'kubernetes.io/service-account-token': { bg: '#FFF7ED', fg: '#C2410C' },
};

const SecretsPage = () => {
    const [items, setItems] = useState<K8sSecretResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [namespaceFilter, setNamespaceFilter] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<K8sSecretResponse | null>(null);
    const [form, setForm] = useState({ name: '', namespace: 'default', type: 'Opaque', keys: [{ key: '', value: '' }], labels: '' });
    const [saving, setSaving] = useState(false);

    const [detailItem, setDetailItem] = useState<K8sSecretResponse | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<K8sSecretResponse | null>(null);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const result = await k8sService.listSecretsPaginated(page, PAGE_SIZE, namespaceFilter || undefined);
            setItems(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load Secrets'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page, namespaceFilter]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((s) => [s.name, s.namespace, s.type].join(' ').toLowerCase().includes(q));
    }, [items, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const namespaces = useMemo(() => [...new Set(items.map((s) => s.namespace))], [items]);

    const resetForm = () => setForm({ name: '', namespace: 'default', type: 'Opaque', keys: [{ key: '', value: '' }], labels: '' });

    const handleCreateOrUpdate = async () => {
        if (!form.name.trim()) return toast.error('Name is required');
        const data: Record<string, string> = {};
        form.keys.filter((k) => k.key.trim()).forEach((k) => { data[k.key.trim()] = k.value; });
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                namespace: form.namespace.trim() || 'default',
                type: form.type,
                data: Object.keys(data).length > 0 ? data : undefined,
                labels: form.labels.trim() ? Object.fromEntries(form.labels.split(',').map((s) => { const [k, ...v] = s.trim().split('='); return [k, v.join('=')]; })) : undefined,
            };

            if (editTarget) {
                await k8sService.updateSecret(editTarget.name, payload);
                toast.success('Secret updated');
            } else {
                await k8sService.createSecret(payload);
                toast.success('Secret created');
            }
            setCreateOpen(false);
            setEditTarget(null);
            resetForm();
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, editTarget ? 'Failed to update Secret' : 'Failed to create Secret'));
        } finally { setSaving(false); }
    };

    const openEdit = (s: K8sSecretResponse) => {
        const keys = s.dataKeys.map((k) => ({ key: k, value: '' }));
        if (keys.length === 0) keys.push({ key: '', value: '' });
        setForm({
            name: s.name,
            namespace: s.namespace,
            type: s.type,
            keys,
            labels: Object.entries(s.labels).map(([k, v]) => `${k}=${v}`).join(', '),
        });
        setEditTarget(s);
        setCreateOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.deleteSecret(deleteTarget.name, deleteTarget.namespace);
            toast.success('Secret deleted');
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete Secret'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>Secrets</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>Kubernetes sensitive data stores</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh"><span><IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); }} sx={{ px: 2.5 }}>New Secret</MyCustomButton>
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: 'Total', value: items.length, bg: '#F8FAFC', fg: '#475569' },
                    { label: 'Total entries', value: items.reduce((sum, s) => sum + s.dataEntries, 0), bg: '#EFF6FF', fg: '#2563EB' },
                    { label: 'Types', value: [...new Set(items.map((s) => s.type))].length, bg: '#F0FDF4', fg: '#16A34A' },
                    { label: 'Namespaces', value: namespaces.length, bg: '#FAF5FF', fg: '#7C3AED' },
                ].map((kpi) => (
                    <Paper key={kpi.label} sx={{ p: 2, borderRadius: 3, bg: kpi.bg, border: `1px solid ${kpi.fg}22`, boxShadow: 'none' }}>
                        <Typography sx={{ color: kpi.fg, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</Typography>
                        <Typography sx={{ color: kpi.fg, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{kpi.value}</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Secrets..." sx={{ flex: 1, minWidth: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>,
                            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : undefined,
                        },
                    }} />
                <TextField size="small" select value={namespaceFilter} onChange={(e) => setNamespaceFilter(e.target.value)} sx={{ minWidth: 160 }}
                    slotProps={{ select: { displayEmpty: true } }}>
                    <MenuItem value="">All namespaces</MenuItem>
                    {namespaces.map((ns) => <MenuItem key={ns} value={ns}>{ns}</MenuItem>)}
                </TextField>
                <Chip label={`${filtered.length} / ${totalElements}`} size="small" sx={{ backgroundColor: '#E4EEF7', color: '#2E5C8A', fontWeight: 700, fontSize: 12 }} />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />)}</Box>}

            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <LockIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {namespaceFilter ? `No Secrets in "${namespaceFilter}"` : 'No Secrets'}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>
                            {namespaceFilter ? 'Try a different namespace' : 'Create your first Secret to store sensitive data'}
                        </Typography>
                        {!namespaceFilter && <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); }}>New Secret</MyCustomButton>}
                    </Card>
                </Fade>
            )}

            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filtered.map((s) => {
                        const isExpanded = detailItem?.name === s.name && detailItem?.namespace === s.namespace;
                        const tc = TYPE_COLORS[s.type] ?? { bg: '#F3F4F6', fg: '#374151' };
                        return (
                            <Card key={s.name + s.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', transition: 'all 0.15s ease', '&:hover': { borderColor: '#C8D0DC' } }}>
                                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${tc.fg}, #7C3AED)` }} />
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <LockIcon sx={{ color: '#D97706', fontSize: 18 }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{s.name}</Typography>
                                                <Chip label={s.type} size="small" sx={{ backgroundColor: tc.bg, color: tc.fg, fontWeight: 700, fontSize: 9, height: 20 }} />
                                                <Chip label={`${s.dataEntries} entries`} size="small" sx={{ backgroundColor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700, fontSize: 9, height: 20 }} />
                                            </Box>
                                            <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{s.namespace}</Typography>
                                        </Box>
                                    </Box>

                                    {!isExpanded ? (
                                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                            {s.dataKeys.slice(0, 6).map((k) => (
                                                <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: 10, fontFamily: 'monospace' }} />
                                            ))}
                                            {s.dataKeys.length > 6 && (
                                                <Chip label={`+${s.dataKeys.length - 6} more`} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 10 }} />
                                            )}
                                            {s.dataKeys.length === 0 && (
                                                <Typography sx={{ color: C.subtle, fontStyle: 'italic', fontSize: 12 }}>No data entries</Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, boxShadow: 'none', mt: 1 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>Key</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>Value</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {s.dataKeys.map((k) => (
                                                        <TableRow key={k} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{k}</TableCell>
                                                            <TableCell sx={{ color: C.subtle, fontStyle: 'italic', fontSize: 11 }}>(base64 encoded)</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}

                                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                                        {Object.entries(s.labels).map(([k, v]) => (
                                            <Chip key={k} label={`${k}: ${v}`} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 9, height: 18 }} />
                                        ))}
                                    </Box>

                                    {s.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1.5 }}>Created {fmtDate(s.createdAt)}</Typography>}
                                </CardContent>
                                <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA', gap: 0.5 }}>
                                    <Tooltip title="View keys"><IconButton size="small" onClick={() => setDetailItem(isExpanded ? null : s)} sx={{ color: C.muted }}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(s)} sx={{ color: '#2563EB' }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(s)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </CardActions>
                            </Card>
                        );
                    })}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setEditTarget(null); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LockIcon sx={{ color: '#D97706', fontSize: 20 }} /> {editTarget ? 'Edit Secret' : 'New Secret'}</Box>
                    <IconButton size="small" onClick={() => { setCreateOpen(false); setEditTarget(null); }}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required disabled={!!editTarget} />
                            <TextField size="small" label="Namespace" value={form.namespace} onChange={(e) => setForm((p) => ({ ...p, namespace: e.target.value }))} disabled={!!editTarget} />
                        </Box>
                        <TextField size="small" select label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                            {SECRET_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField size="small" label="Labels" value={form.labels} onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))} placeholder="env=prod,team=backend" helperText="Comma-separated key=value" />
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LockIcon sx={{ fontSize: 14, color: '#D97706' }} /> Data entries
                        </Typography>
                        {form.keys.map((entry, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 1, alignItems: 'center' }}>
                                <TextField size="small" label="Key" value={entry.key} onChange={(e) => { const keys = [...form.keys]; keys[i].key = e.target.value; setForm((p) => ({ ...p, keys })); }} />
                                <TextField size="small" label="Value" value={entry.value} onChange={(e) => { const keys = [...form.keys]; keys[i].value = e.target.value; setForm((p) => ({ ...p, keys })); }} multiline maxRows={4} />
                                <IconButton size="small" onClick={() => { const keys = form.keys.filter((_, idx) => idx !== i); setForm((p) => ({ ...p, keys: keys.length ? keys : [{ key: '', value: '' }] })); }} sx={{ color: C.danger }}><CloseIcon fontSize="small" /></IconButton>
                            </Box>
                        ))}
                        <Button variant="text" size="small" onClick={() => setForm((p) => ({ ...p, keys: [...p.keys, { key: '', value: '' }] }))} sx={{ textTransform: 'capitalize', fontWeight: 600, justifyContent: 'flex-start', pl: 0 }}>+ Add entry</Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => { setCreateOpen(false); setEditTarget(null); }} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <MyCustomButton onClick={handleCreateOrUpdate} disabled={saving} sx={{ px: 3 }}>{saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Secret</DialogTitle>
                <DialogContent><Typography>Delete <strong>{deleteTarget?.name}</strong> in <strong>{deleteTarget?.namespace}</strong>?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SecretsPage;
