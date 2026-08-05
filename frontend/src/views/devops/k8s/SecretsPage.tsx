import { Add as AddIcon, Close as CloseIcon, ContentCopy, Delete as DeleteIcon, Lock as LockIcon, Refresh as RefreshIcon, Search as SearchIcon, Visibility as VisibilityIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { k8sService } from '../../../services/k8sService';
import type { K8sSecretResponse } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { canManageK8s } from '../../../services/authorization';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C } from '../../../theme/tokens';
import { fmtDate } from './constants';
import { useInlineErrors } from '../../../hooks/useInlineErrors';

const SECRET_TYPES = ['Opaque', 'kubernetes.io/tls', 'kubernetes.io/dockerconfigjson', 'kubernetes.io/service-account-token', 'kubernetes.io/basic-auth', 'kubernetes.io/ssh-auth'];

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    'Opaque': { bg: '#F3F4F6', fg: '#374151' },
    'kubernetes.io/tls': { bg: '#FCE7F3', fg: '#BE185D' },
    'kubernetes.io/dockerconfigjson': { bg: '#E9E6F6', fg: '#5E4B9E' },
    'kubernetes.io/service-account-token': { bg: '#FFF7ED', fg: '#C2410C' },
};

const SecretsPage = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState<K8sSecretResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<K8sSecretResponse | null>(null);
    const [form, setForm] = useState({ name: '', type: 'Opaque', keys: [{ key: '', value: '' }], labels: '' });
    const [saving, setSaving] = useState(false);

    const [detailItem, setDetailItem] = useState<K8sSecretResponse | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<K8sSecretResponse | null>(null);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const allowManage = canManageK8s(getStoredUser()!);
    const { errors, setFieldError, clearFieldError } = useInlineErrors();

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const result = await k8sService.listSecretsPaginated(page, PAGE_SIZE);
            setItems(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load Secrets'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((s) => [s.name, s.namespace, s.type].join(' ').toLowerCase().includes(q));
    }, [items, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const resetForm = () => setForm({ name: '', type: 'Opaque', keys: [{ key: '', value: '' }], labels: '' });

    const handleCreateOrUpdate = async () => {
        if (!form.name.trim()) {
            setFieldError('name', t('k8s.secrets.nameRequired'));
            return;
        }
        const data: Record<string, string> = {};
        form.keys.filter((k) => k.key.trim()).forEach((k) => { data[k.key.trim()] = k.value; });
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                type: form.type,
                data: Object.keys(data).length > 0 ? data : undefined,
                labels: form.labels.trim() ? Object.fromEntries(form.labels.split(',').map((s) => { const [k, ...v] = s.trim().split('='); return [k, v.join('=')]; })) : undefined,
            };

            if (editTarget) {
                await k8sService.updateSecret(editTarget.name, payload);
                toast.success(t('k8s.secrets.updatedToast'));
            } else {
                await k8sService.createSecret(payload);
                toast.success(t('k8s.secrets.createdToast'));
            }
            setCreateOpen(false);
            setEditTarget(null);
            resetForm();
            clearFieldError('name');
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
            toast.success(t('k8s.secrets.deletedToast'));
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete Secret'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.secrets.title')}</Typography><Typography sx={{ color: C.muted, fontSize: 14 }}>{t('k8s.secrets.subtitle')}</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}><span><IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}><RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} /></IconButton></span></Tooltip>
                    {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); clearFieldError('name'); }} sx={{ px: 2.5 }}>{t('k8s.secrets.new')}</MyCustomButton>}
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
                {[
                    { label: t('k8s.secrets.total'), value: items.length, bg: '#F8FAFC', fg: '#475569' },
                    { label: t('k8s.secrets.totalEntries'), value: items.reduce((sum, s) => sum + s.dataEntries, 0), bg: '#FCE7F3', fg: '#BE185D' },
                    { label: t('k8s.secrets.types'), value: [...new Set(items.map((s) => s.type))].length, bg: '#F0FDF4', fg: '#16A34A' },
                ].map((kpi) => (
                    <Paper key={kpi.label} sx={{ p: 2, borderRadius: 3, bg: kpi.bg, border: `1px solid ${kpi.fg}22`, boxShadow: 'none' }}>
                        <Typography sx={{ color: kpi.fg, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</Typography>
                        <Typography sx={{ color: kpi.fg, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{kpi.value}</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${C.border}`, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'none' }}>
                <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('k8s.secrets.search')} sx={{ flex: 1, minWidth: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>,
                            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : undefined,
                        },
                    }} />
                <Chip label={`${filtered.length} / ${totalElements}`} size="small" sx={{ backgroundColor: '#FCE7F3', color: '#BE185D', fontWeight: 700, fontSize: 12 }} />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />)}</Box>}

            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <LockIcon sx={{ fontSize: 56, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {t('k8s.secrets.noSecrets')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>
                            {t('k8s.secrets.createFirst')}
                        </Typography>
                        {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={() => { resetForm(); setEditTarget(null); setCreateOpen(true); clearFieldError('name'); }}>{t('k8s.secrets.new')}</MyCustomButton>}
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
                            <Card key={s.name + s.namespace} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.15s ease', '&:hover': { borderColor: '#C8D0DC' } }}>
                                <Box sx={{ height: 3, background: `linear-gradient(90deg, ${tc.fg}, #9D174D)`, flexShrink: 0 }} />
                                <CardContent sx={{ p: 2.5, flex: 1, '&:last-child': { pb: 2.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <LockIcon sx={{ color: '#BE185D', fontSize: 18 }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{s.name}</Typography>
                                                <Chip label={s.type} size="small" sx={{ backgroundColor: tc.bg, color: tc.fg, fontWeight: 700, fontSize: 9, height: 20 }} />
                                                <Chip label={t('k8s.secrets.entries', { count: s.dataEntries })} size="small" sx={{ backgroundColor: '#E0F1E6', color: '#2E7A4F', fontWeight: 700, fontSize: 9, height: 20 }} />
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
                                                <Chip label={t('k8s.secrets.more', { count: s.dataKeys.length - 6 })} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: 10 }} />
                                            )}
                                            {s.dataKeys.length === 0 && (
                                                <Typography sx={{ color: C.subtle, fontStyle: 'italic', fontSize: 12 }}>{t('k8s.secrets.noDataEntries')}</Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, boxShadow: 'none', mt: 1 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>{t('k8s.secrets.key')}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.muted }}>{t('k8s.secrets.value')}</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {s.dataKeys.map((k) => (
                                                        <TableRow key={k} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{k}</TableCell>
                                                            <TableCell sx={{ color: C.subtle, fontStyle: 'italic', fontSize: 11 }}>{t('k8s.secrets.base64Encoded')}</TableCell>
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

                                    {s.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1.5 }}>{t('k8s.secrets.created')} {fmtDate(s.createdAt)}</Typography>}
                                </CardContent>
                                <CardActions sx={{ px: 2.5, py: 1, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, bg: '#FAFAFA', gap: 0.5, mt: 'auto' }}>
                                    <Tooltip title={t('k8s.secrets.viewKeys')}><IconButton size="small" onClick={() => setDetailItem(isExpanded ? null : s)} sx={{ color: C.muted }}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                    {allowManage && (
                                        <>
                                            <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(s)} sx={{ color: '#BE185D' }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                            <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setDeleteTarget(s)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                        </>
                                    )}
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
                                <LockIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>{editTarget ? t('k8s.secrets.edit') : t('k8s.secrets.new')}</Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{t('k8s.secrets.subtitle')}</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => { setCreateOpen(false); setEditTarget(null); }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5 }}>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <TextField size="small" label={t('k8s.secrets.name')} value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); clearFieldError('name'); }} required disabled={!!editTarget} error={Boolean(errors.name)} helperText={errors.name} />
                        <TextField size="small" select label={t('k8s.secrets.type')} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                            {SECRET_TYPES.map((ty) => <MenuItem key={ty} value={ty}>{ty}</MenuItem>)}
                        </TextField>
                        <TextField size="small" label={t('k8s.secrets.labels')} value={form.labels} onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))} placeholder="env=prod,team=backend" helperText={t('k8s.secrets.labelsHint')} />
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LockIcon sx={{ fontSize: 14, color: '#BE185D' }} /> {t('k8s.secrets.dataEntries')}
                        </Typography>
                        {form.keys.map((entry, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 1, alignItems: 'center' }}>
                                <TextField size="small" label={t('k8s.secrets.key')} value={entry.key} onChange={(e) => { const keys = [...form.keys]; keys[i].key = e.target.value; setForm((p) => ({ ...p, keys })); }} />
                                <TextField size="small" label={t('k8s.secrets.value')} value={entry.value} onChange={(e) => { const keys = [...form.keys]; keys[i].value = e.target.value; setForm((p) => ({ ...p, keys })); }} multiline maxRows={4} />
                                <IconButton size="small" onClick={() => { const keys = form.keys.filter((_, idx) => idx !== i); setForm((p) => ({ ...p, keys: keys.length ? keys : [{ key: '', value: '' }] })); }} sx={{ color: C.danger }}><CloseIcon fontSize="small" /></IconButton>
                            </Box>
                        ))}
                        <Button variant="text" size="small" onClick={() => setForm((p) => ({ ...p, keys: [...p.keys, { key: '', value: '' }] }))} sx={{ textTransform: 'capitalize', fontWeight: 600, justifyContent: 'flex-start', pl: 0 }}>{t('k8s.secrets.addEntry')}</Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => { setCreateOpen(false); setEditTarget(null); }} sx={{ borderRadius: '5px', textTransform: 'capitalize' }}>{t('k8s.secrets.cancel')}</Button>
                    <MyCustomButton onClick={handleCreateOrUpdate} disabled={saving} sx={{ px: 3 }}>{saving ? t('k8s.secrets.saving') : editTarget ? t('k8s.secrets.update') : t('k8s.secrets.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
                    <WarningAmberIcon sx={{ color: '#DC2626' }} />
                    {t('k8s.secrets.deleteTitle')}
                </DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>{t('k8s.secrets.deleteConfirm', { name: deleteTarget?.name, namespace: deleteTarget?.namespace })}</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('k8s.secrets.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('k8s.secrets.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SecretsPage;
