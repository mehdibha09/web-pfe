import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import TrafficIcon from '@mui/icons-material/Traffic';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Skeleton,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { k8sService } from '../../../services/k8sService';
import type { K8sIngressResponse, K8sIngressRule, K8sIngressTLS } from '../../../services/interfaces/k8s';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import PaginationBar from '../../../components/PaginationBar';

interface PathEntry { path: string; pathType: string; serviceName: string; servicePort: number; }
interface RuleEntry { host: string; paths: PathEntry[]; }
interface TLSEntry { hosts: string; secretName: string; }

const PATH_TYPES = ['Prefix', 'Exact', 'ImplementationSpecific'];

const IngressPage = () => {
    const { t } = useTranslation();
    const [ingresses, setIngresses] = useState<K8sIngressResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [nsFilter, setNsFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<K8sIngressResponse | null>(null);

    const [name, setName] = useState('');
    const [namespace, setNamespace] = useState('default');
    const [ingressClass, setIngressClass] = useState('');
    const [rules, setRules] = useState<RuleEntry[]>([{ host: '', paths: [{ path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 }] }]);
    const [tlsEntries, setTlsEntries] = useState<TLSEntry[]>([]);
    const [saving, setSaving] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 6;

    const load = async () => {
        setLoading(true);
        try {
            const result = await k8sService.listIngressesPaginated(page, PAGE_SIZE, nsFilter || undefined);
            setIngresses(result.items);
            setTotalElements(result.total);
            setLoadError(null);
        } catch (e: unknown) {
            const msg = getErrorMessage(e, t('common.error'));
            setLoadError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);
    useEffect(() => { setPage(0); }, [search, nsFilter]);

    const namespaces = useMemo(() => {
        const set = new Set(ingresses.map((i) => i.namespace));
        return ['', ...Array.from(set).sort()];
    }, [ingresses]);

    const totalCount = ingresses.length;

    const resetForm = () => {
        setName('');
        setNamespace('default');
        setIngressClass('');
        setRules([{ host: '', paths: [{ path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 }] }]);
        setTlsEntries([]);
    };

    const openCreate = () => {
        setEditing(null);
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (ing: K8sIngressResponse) => {
        setEditing(ing);
        setName(ing.name);
        setNamespace(ing.namespace);
        setIngressClass(ing.ingressClassName || '');
        setRules(ing.rules.map((r) => ({
            host: r.host || '',
            paths: r.paths.map((p) => ({ path: p.path, pathType: p.pathType, serviceName: p.serviceName, servicePort: p.servicePort })),
        })));
        setTlsEntries(ing.tls.map((t) => ({
            hosts: (t.hosts || []).join(', '),
            secretName: t.secretName || '',
        })));
        setDialogOpen(true);
    };

    const addRule = () => {
        setRules((prev) => [...prev, { host: '', paths: [{ path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 }] }]);
    };

    const removeRule = (idx: number) => {
        setRules((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateRule = (idx: number, field: keyof RuleEntry, value: string) => {
        setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    const addPath = (ruleIdx: number) => {
        setRules((prev) => prev.map((r, i) => i === ruleIdx
            ? { ...r, paths: [...r.paths, { path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 }] }
            : r));
    };

    const removePath = (ruleIdx: number, pathIdx: number) => {
        setRules((prev) => prev.map((r, i) => i === ruleIdx
            ? { ...r, paths: r.paths.filter((_, j) => j !== pathIdx) }
            : r));
    };

    const updatePath = (ruleIdx: number, pathIdx: number, field: keyof PathEntry, value: string | number) => {
        setRules((prev) => prev.map((r, i) => i === ruleIdx
            ? {
                ...r,
                paths: r.paths.map((p, j) => j === pathIdx ? { ...p, [field]: value } : p),
            }
            : r));
    };

    const addTlsEntry = () => {
        setTlsEntries((prev) => [...prev, { hosts: '', secretName: '' }]);
    };

    const removeTlsEntry = (idx: number) => {
        setTlsEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateTlsEntry = (idx: number, field: keyof TLSEntry, value: string) => {
        setTlsEntries((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    const buildRules = (): K8sIngressRule[] => {
        return rules.map((r) => ({
            host: r.host || undefined,
            paths: r.paths.filter((p) => p.serviceName.trim()).map((p) => ({
                path: p.path || '/',
                pathType: p.pathType || 'Prefix',
                serviceName: p.serviceName,
                servicePort: p.servicePort,
            })),
        })).filter((r) => r.paths.length > 0);
    };

    const buildTls = (): K8sIngressTLS[] => {
        return tlsEntries
            .filter((t) => t.hosts.trim())
            .map((t) => ({
                hosts: t.hosts.split(',').map((h) => h.trim()).filter(Boolean),
                secretName: t.secretName.trim() || undefined,
            }));
    };

    const handleSave = async () => {
        if (!name.trim()) return toast.error(t('common.error'));
        if (!namespace.trim()) return toast.error(t('common.error'));
        const finalRules = buildRules();
        if (finalRules.length === 0) return toast.error(t('common.error'));
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                namespace: namespace.trim(),
                ingressClassName: ingressClass.trim() || undefined,
                rules: finalRules,
                tls: buildTls().length > 0 ? buildTls() : undefined,
            };
            if (editing) {
                await k8sService.updateIngress(editing.name, payload);
                toast.success(t('common.success'));
            } else {
                await k8sService.createIngress(payload);
                toast.success(t('common.success'));
            }
            setDialogOpen(false);
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (name: string, namespace: string) => {
        if (!window.confirm(`Delete ingress "${name}" in namespace "${namespace}"?`)) return;
        try {
            await k8sService.deleteIngress(name, namespace);
            toast.success(t('common.success'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        }
    };

    const tlsCount = useMemo(() => ingresses.filter((i) => i.tls.length > 0).length, [ingresses]);
    const withAddresses = useMemo(() => ingresses.filter((i) => i.addresses.length > 0).length, [ingresses]);
    const hostCount = ingresses.reduce((acc, i) => acc + i.rules.filter((r) => r.host).length, 0);

    return (
        <Box sx={{ p: 4 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('k8s.ingresses.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted }}>{t('k8s.ingresses.subtitle')}</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                    {t('k8s.ingresses.create')}
                </Button>

            {!loading && ingresses.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                    {[
                        { label: t('k8s.ingresses.total'), value: totalCount, bg: '#F4F0FA', color: '#5E4B9E' },
                        { label: t('k8s.ingresses.hosts'), value: hostCount, bg: '#FCE7F3', color: '#BE185D' },
                        { label: 'TLS', value: tlsCount, bg: '#F7ECD6', color: '#8A6A2E' },
                        { label: t('k8s.ingresses.addressed'), value: withAddresses, bg: '#D1FAE5', color: '#065F46' },
                    ].map((kpi) => (
                        <Card key={kpi.label} sx={{ borderRadius: 3, backgroundColor: kpi.bg, transition: '0.2s', '&:hover': { translate: '0 -2px' } }}>
                            <CardContent sx={{ py: 2, px: 2.5 }}>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1.1 }}>
                                    {kpi.value}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                    {kpi.label}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder={t('k8s.ingresses.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: C.subtle, fontSize: 20 }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, background: C.surface } }}
                />
                <TextField select size="small" value={nsFilter} onChange={(e) => setNsFilter(e.target.value)} sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, background: C.surface } }}>
                    <MenuItem value="">{t('k8s.ingresses.allNamespaces')}</MenuItem>
                    {namespaces.filter(Boolean).map((ns) => (
                        <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                    ))}
                </TextField>
            </Box>

            {loadError && !loading && (
                <Card sx={{ borderRadius: 3, mb: 3, bgcolor: '#F7DEE3', border: '1px solid #C95B6E' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: 28 }}>⚠</Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#A23B4E' }}>
                                {t('k8s.ingresses.clusterUnavailable')}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#A23B4E' }}>
                                {loadError}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <Grid container spacing={2}>
                    {[1, 2, 3].map((i) => (
                        <Grid key={i} size={{ xs: 12, md: 6 }}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Skeleton variant="text" width="60%" height={28} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                    <Skeleton variant="text" width="90%" height={20} />
                                    <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : ingresses.length === 0 ? (
                <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                            {ingresses.length === 0 ? t('k8s.ingresses.noIngresses') : t('k8s.ingresses.noResults')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2 }}>
                            {ingresses.length === 0 ? t('k8s.ingresses.createFirst') : t('k8s.ingresses.adjustSearch')}
                        </Typography>
                        {ingresses.length === 0 && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                                {t('k8s.ingresses.create')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (<>
                <Grid container spacing={2}>
                    {ingresses.map((ing) => (
                        <Grid key={`${ing.namespace}/${ing.name}`} size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                            <Card sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontFamily: 'monospace', fontSize: 15, wordBreak: 'break-all' }}>
                                            {ing.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Chip label={ing.namespace} size="small" variant="outlined" sx={{ borderColor: C.border, fontWeight: 600, fontSize: 11 }} />
                                            {ing.tls.length > 0 && <Chip label="TLS" size="small" sx={{ backgroundColor: '#F7ECD6', color: '#8A6A2E', fontWeight: 700, height: 24 }} />}
                                        </Box>
                                    </Box>

                                    {ing.ingressClassName && (
                                        <Typography variant="caption" sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, mb: 0.5, display: 'block' }}>
                                            Class: {ing.ingressClassName}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                                        {ing.rules.map((r, ri) => (
                                            <Box key={ri} sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5, border: `1px solid ${C.border}` }}>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.text, fontFamily: 'monospace', fontSize: 12 }}>
                                                    {r.host || '(any host)'}
                                                </Typography>
                                                {r.paths.map((p, pi) => (
                                                    <Box key={pi} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, ml: 1 }}>
                                                        <Chip label={p.pathType} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, backgroundColor: '#FCE7F3', color: '#BE185D' }} />
                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: C.muted }}>
                                                            {p.path} → {p.serviceName}:{p.servicePort}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ))}
                                    </Box>

                                    {ing.tls.length > 0 && (
                                        <Box sx={{ mb: 1 }}>
                                            {ing.tls.map((t, ti) => (
                                                <Typography key={ti} variant="caption" sx={{ color: '#8A6A2E', fontFamily: 'monospace', fontSize: 11, display: 'block' }}>
                                                    TLS: {t.hosts.join(', ')} {t.secretName ? `(secret: ${t.secretName})` : ''}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}

                                    {ing.addresses.length > 0 && (
                                        <Typography variant="caption" sx={{ color: '#065F46', fontFamily: 'monospace', fontSize: 11, display: 'block', mb: 0.5 }}>
                                            LB: {ing.addresses.join(', ')}
                                        </Typography>
                                    )}

                                    <Typography variant="caption" sx={{ color: C.muted, display: 'block' }}>
                                        {ing.createdAt ? new Date(ing.createdAt).toLocaleString() : ''}
                                    </Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                                        <Tooltip title={t('common.edit')!}>
                                            <IconButton size="small" onClick={() => openEdit(ing)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('common.delete')!}>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(ing.name, ing.namespace)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{ flex: 1 }} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                <PaginationBar page={page + 1} pageCount={Math.max(1, Math.ceil(totalElements / PAGE_SIZE))} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <TrafficIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>
                                    {editing ? t('k8s.ingresses.editTitle', { name: editing.name }) : t('k8s.ingresses.create')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{t('k8s.ingresses.subtitle')}</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <TextField fullWidth label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} disabled={!!editing} />
                            <TextField fullWidth label="Namespace" value={namespace} onChange={(e) => setNamespace(e.target.value)} disabled={!!editing} />
                            <TextField fullWidth label="Ingress Class" value={ingressClass} onChange={(e) => setIngressClass(e.target.value)} placeholder="e.g. nginx" />
                        </Box>

                        <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <TrafficIcon sx={{ fontSize: 16, color: '#3E6E9E' }} /> Rules
                                </Typography>
                                <Button size="small" onClick={addRule} sx={{ textTransform: 'none', color: C.brand, fontWeight: 600 }}>+ Add Rule</Button>
                            </Box>
                            {rules.map((rule, ri) => (
                                <Box key={ri} sx={{ mb: 2, p: 2, border: `1px solid ${C.border}`, borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                        <TextField size="small" label="Host" value={rule.host} onChange={(e) => updateRule(ri, 'host', e.target.value)} placeholder="e.g. app.example.com" sx={{ flex: 1 }} />
                                        <IconButton size="small" color="error" onClick={() => removeRule(ri)} disabled={rules.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                                    </Box>
                                    <Box sx={{ pl: 2, borderLeft: `2px solid ${C.border}` }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: C.muted }}>Paths</Typography>
                                            <Button size="small" onClick={() => addPath(ri)} sx={{ textTransform: 'none', color: C.brand, fontSize: 12 }}>+ Add Path</Button>
                                        </Box>
                                        {rule.paths.map((path, pi) => (
                                            <Box key={pi} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                <TextField size="small" label="Path" value={path.path} onChange={(e) => updatePath(ri, pi, 'path', e.target.value)} placeholder="/" sx={{ width: 120 }} />
                                                <TextField select size="small" label={t('common.type')} value={path.pathType} onChange={(e) => updatePath(ri, pi, 'pathType', e.target.value)} sx={{ width: 160 }}>
                                                    {PATH_TYPES.map((pt) => <MenuItem key={pt} value={pt}>{pt}</MenuItem>)}
                                                </TextField>
                                                <TextField size="small" label="Service" value={path.serviceName} onChange={(e) => updatePath(ri, pi, 'serviceName', e.target.value)} placeholder="svc-name" sx={{ width: 140 }} />
                                                <TextField size="small" type="number" label="Port" value={path.servicePort} onChange={(e) => updatePath(ri, pi, 'servicePort', Number(e.target.value))} sx={{ width: 100 }} slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                                                <IconButton size="small" color="error" onClick={() => removePath(ri, pi)} disabled={rule.paths.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <VpnKeyIcon sx={{ fontSize: 16, color: '#8A6A2E' }} /> TLS
                                </Typography>
                                <Button size="small" onClick={addTlsEntry} sx={{ textTransform: 'none', color: C.brand, fontWeight: 600 }}>+ Add TLS</Button>
                            </Box>
                            {tlsEntries.map((tls, ti) => (
                                <Box key={ti} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                    <TextField size="small" label="Hosts (comma-separated)" value={tls.hosts} onChange={(e) => updateTlsEntry(ti, 'hosts', e.target.value)} placeholder="app.example.com" sx={{ flex: 1 }} />
                                    <TextField size="small" label="Secret Name" value={tls.secretName} onChange={(e) => updateTlsEntry(ti, 'secretName', e.target.value)} placeholder="tls-secret" sx={{ width: 200 }} />
                                    <IconButton size="small" color="error" onClick={() => removeTlsEntry(ti)}><DeleteIcon fontSize="small" /></IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' }, '&.Mui-disabled': { background: '#FCE7F3' } }}>
                        {saving ? t('common.saving') : (editing ? t('common.save') : t('k8s.ingresses.create'))}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default IngressPage;