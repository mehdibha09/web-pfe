import { Add as AddIcon, Close as CloseIcon, ContentCopy, Delete as DeleteIcon, Refresh as RefreshIcon, Save as SaveIcon, Search as SearchIcon, Storage as StorageIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { k8sService } from '../../../services/k8sService';
import type { K8sConfigMapResponse } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';

const ConfigMapsPage = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState<K8sConfigMapResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [namespaceFilter, setNamespaceFilter] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<K8sConfigMapResponse | null>(null);
    const [form, setForm] = useState({ name: '', namespace: 'default', keys: [{ key: '', value: '' }], labels: '' });
    const [saving, setSaving] = useState(false);

    const [detailItem, setDetailItem] = useState<K8sConfigMapResponse | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<K8sConfigMapResponse | null>(null);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const result = await k8sService.listConfigMapsPaginated(page, PAGE_SIZE, namespaceFilter || undefined);
            setItems(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load ConfigMaps'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page, namespaceFilter]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((cm) =>
            [cm.name, cm.namespace].join(' ').toLowerCase().includes(q)
        );
    }, [items, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const namespaces = useMemo(() => [...new Set(items.map((cm) => cm.namespace))], [items]);

    const resetForm = () => setForm({ name: '', namespace: 'default', keys: [{ key: '', value: '' }], labels: '' });

    const buildDataFromKeys = (keys: { key: string; value: string }[]) => {
        const data: Record<string, string> = {};
        keys.filter((k) => k.key.trim()).forEach((k) => { data[k.key.trim()] = k.value; });
        return Object.keys(data).length > 0 ? data : undefined;
    };

    const handleCreateOrUpdate = async () => {
        if (!form.name.trim()) return toast.error(t('k8s.configmaps.nameRequired'));
        const data = buildDataFromKeys(form.keys);
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                namespace: form.namespace.trim() || 'default',
                data,
                labels: form.labels.trim() ? Object.fromEntries(form.labels.split(',').map((s) => { const [k, ...v] = s.trim().split('='); return [k, v.join('=')]; })) : undefined,
            };

            if (editTarget) {
                await k8sService.updateConfigMap(editTarget.name, payload);
                toast.success(t('k8s.configmaps.updatedToast'));
            } else {
                await k8sService.createConfigMap(payload);
                toast.success(t('k8s.configmaps.createdToast'));
            }
            setCreateOpen(false);
            setEditTarget(null);
            resetForm();
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, editTarget ? 'Failed to update ConfigMap' : 'Failed to create ConfigMap'));
        } finally { setSaving(false); }
    };

    const openEdit = (cm: K8sConfigMapResponse) => {
        const keys = Object.entries(cm.data).map(([k, v]) => ({ key: k, value: v }));
        if (keys.length === 0) keys.push({ key: '', value: '' });
        setForm({
            name: cm.name,
            namespace: cm.namespace,
            keys,
            labels: Object.entries(cm.labels).map(([k, v]) => `${k}=${v}`).join(', '),
        });
        setEditTarget(cm);
        setCreateOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.deleteConfigMap(deleteTarget.name, deleteTarget.namespace);
            toast.success(t('k8s.configmaps.deletedToast'));
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete ConfigMap'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.configmaps.title')}</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>{t('k8s.configmaps.subtitle')}</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}><span><IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); }} sx={{ px: 2.5 }}>{t('k8s.configmaps.new')}</MyCustomButton>
                </Box>
            </Box>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: t('k8s.configmaps.total'), value: items.length, bg: '#F8FAFC', fg: '#475569' },
                    { label: t('k8s.configmaps.totalEntries'), value: items.reduce((sum, cm) => sum + cm.dataEntries, 0), bg: '#FCE7F3', fg: '#BE185D' },
                    { label: 'Avg entries', value: items.length ? Math.round(items.reduce((sum, cm) => sum + cm.dataEntries, 0) / items.length) : 0, bg: '#F0FDF4', fg: '#16A34A' },
                    { label: t('k8s.configmaps.namespaces'), value: namespaces.length, bg: '#FAF5FF', fg: '#9D174D' },
                ].map((kpi) => (
                    <Paper key={kpi.label} sx={{ p: 2, borderRadius: 3, bg: kpi.bg, border: `1px solid ${kpi.fg}22`, boxShadow: 'none' }}>
                        <Typography sx={{ color: kpi.fg, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</Typography>
                        <Typography sx={{ color: kpi.fg, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{kpi.value}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('k8s.configmaps.search')} sx={{ flex: 1, minWidth: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>,
                            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : undefined,
                        },
                    }} />
                <TextField size="small" select value={namespaceFilter} onChange={(e) => setNamespaceFilter(e.target.value)} sx={{ minWidth: 160 }}
                    slotProps={{ select: { displayEmpty: true } }}>
                    <MenuItem value="">{t('k8s.configmaps.allNamespaces')}</MenuItem>
                    {namespaces.map((ns) => <MenuItem key={ns} value={ns}>{ns}</MenuItem>)}
                </TextField>
                <Chip label={`${filtered.length} / ${totalElements}`} size="small" sx={{ backgroundColor: '#FCE7F3', color: '#BE185D', fontWeight: 700, fontSize: 12 }} />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Loading */}
            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />)}</Box>}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <StorageIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {namespaceFilter ? t('k8s.configmaps.noConfigMapsInNs', { namespace: namespaceFilter }) : t('k8s.configmaps.noConfigMaps')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>
                            {namespaceFilter ? t('k8s.configmaps.tryDifferentNs') : t('k8s.configmaps.createFirst')}
                        </Typography>
                        {!namespaceFilter && <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); }}>{t('k8s.configmaps.new')}</MyCustomButton>}
                    </Card>
                </Fade>
            )}

            {/* Cards */}
            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filtered.map((cm) => {
                        const isExpanded = detailItem?.name === cm.name && detailItem?.namespace === cm.namespace;
                        return (
                            <Card key={cm.name + cm.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.15s ease', '&:hover': { borderColor: '#C8D0DC' } }}>
                                <Box sx={{ height: 3, background: 'linear-gradient(90deg, #E4477D, #BE185D)', flexShrink: 0 }} />
                                <CardContent sx={{ p: 2.5, flex: 1, '&:last-child': { pb: 2.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <StorageIcon sx={{ color: '#BE185D', fontSize: 18 }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{cm.name}</Typography>
                                                <Chip label={t('k8s.configmaps.entries', { count: cm.dataEntries })} size="small" sx={{ backgroundColor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700, fontSize: 9, height: 20 }} />
                                            </Box>
                                            <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mt: 0.3 }}>{cm.namespace}</Typography>
                                        </Box>
                                    </Box>

                                    {!isExpanded ? (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {Object.entries(cm.data).slice(0, 4).map(([k, v]) => (
                                                <Chip key={k} label={`${k}: ${v.length > 40 ? v.slice(0, 40) + '...' : v}`} size="small" variant="outlined" sx={{ fontSize: 10, maxWidth: 260, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                                            ))}
                                            {Object.keys(cm.data).length > 4 && (
                                                <Chip label={t('k8s.configmaps.more', { count: Object.keys(cm.data).length - 4 })} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 10 }} />
                                            )}
                                            {Object.keys(cm.data).length === 0 && (
                                                <Typography sx={{ color: C.subtle, fontStyle: 'italic', fontSize: 12 }}>{t('k8s.configmaps.noDataEntries')}</Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, boxShadow: 'none', mt: 1 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>{t('k8s.configmaps.key')}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>{t('k8s.configmaps.value')}</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {Object.entries(cm.data).map(([k, v]) => (
                                                        <TableRow key={k} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{k}</TableCell>
                                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: C.muted, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap' }}>{v}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}

                                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                                        {Object.entries(cm.labels).map(([k, v]) => (
                                            <Chip key={k} label={`${k}: ${v}`} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 9, height: 18 }} />
                                        ))}
                                    </Box>

                                    {cm.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1.5 }}>{t('k8s.configmaps.created')} {fmtDate(cm.createdAt)}</Typography>}
                                </CardContent>
                                <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA', gap: 0.5, mt: 'auto' }}>
                                    <Tooltip title={t('k8s.configmaps.viewKeys')}><IconButton size="small" onClick={() => setDetailItem(isExpanded ? null : cm)} sx={{ color: C.muted }}><SaveIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(cm)} sx={{ color: '#BE185D' }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setDeleteTarget(cm)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
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
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <StorageIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>{editTarget ? t('k8s.configmaps.edit') : t('k8s.configmaps.new')}</Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{t('k8s.configmaps.subtitle')}</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => { setCreateOpen(false); setEditTarget(null); }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5 }}>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label={t('k8s.configmaps.name')} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required disabled={!!editTarget} />
                            <TextField size="small" label={t('k8s.configmaps.namespace')} value={form.namespace} onChange={(e) => setForm((p) => ({ ...p, namespace: e.target.value }))} disabled={!!editTarget} />
                        </Box>
                        <TextField size="small" label={t('k8s.configmaps.labels')} value={form.labels} onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))} placeholder="env=prod,team=backend" helperText="Comma-separated key=value pairs" />
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StorageIcon sx={{ fontSize: 14, color: '#BE185D' }} /> {t('k8s.configmaps.dataEntries')}
                        </Typography>
                        {form.keys.map((entry, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 1, alignItems: 'center' }}>
                                <TextField size="small" label={t('k8s.configmaps.key')} value={entry.key} onChange={(e) => { const keys = [...form.keys]; keys[i].key = e.target.value; setForm((p) => ({ ...p, keys })); }} />
                                <TextField size="small" label={t('k8s.configmaps.value')} value={entry.value} onChange={(e) => { const keys = [...form.keys]; keys[i].value = e.target.value; setForm((p) => ({ ...p, keys })); }} multiline maxRows={4} />
                                <IconButton size="small" onClick={() => { const keys = form.keys.filter((_, idx) => idx !== i); setForm((p) => ({ ...p, keys: keys.length ? keys : [{ key: '', value: '' }] })); }} sx={{ color: C.danger }}><CloseIcon fontSize="small" /></IconButton>
                            </Box>
                        ))}
                        <Button variant="text" size="small" onClick={() => setForm((p) => ({ ...p, keys: [...p.keys, { key: '', value: '' }] }))} sx={{ textTransform: 'capitalize', fontWeight: 600, justifyContent: 'flex-start', pl: 0 }}>{t('k8s.configmaps.addEntry')}</Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => { setCreateOpen(false); setEditTarget(null); }} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>{t('k8s.configmaps.cancel')}</Button>
                    <MyCustomButton onClick={handleCreateOrUpdate} disabled={saving} sx={{ px: 3 }}>{saving ? t('k8s.configmaps.saving') : editTarget ? t('k8s.configmaps.update') : t('k8s.configmaps.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('k8s.configmaps.deleteTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: C.muted }}>{t('k8s.configmaps.deleteConfirm', { name: deleteTarget?.name, namespace: deleteTarget?.namespace })}</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('k8s.configmaps.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('k8s.configmaps.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConfigMapsPage;
