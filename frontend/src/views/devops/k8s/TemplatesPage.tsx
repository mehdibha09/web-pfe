import {
    Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Description as TemplateIcon,
    Edit as EditIcon, Refresh as RefreshIcon, Search as SearchIcon
} from '@mui/icons-material';
import {
    Alert, Box, Button, Card, CardContent, CardActions, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Fade, IconButton, InputAdornment, MenuItem, Skeleton,
    TextField, Tooltip, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getStoredUser } from '../../../services/authStorage';
import type { DeploymentTemplate, DeploymentTemplateRequest } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C, fmtDate, PROTOCOLS, IMAGE_PULL_POLICIES, SERVICE_TYPES, RESTART_POLICIES } from './constants';

const SkeletonCard = () => (
    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}` }}>
        <CardContent><Skeleton variant="text" width="60%" height={28} /><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="80%" sx={{ mt: 1 }} /></CardContent>
    </Card>
);

const defaultForm = (tenantId: string): DeploymentTemplateRequest => ({
    name: '', description: '', dockerImage: '', port: 80, tenantId,
    protocol: 'TCP', imagePullPolicy: 'IfNotPresent', serviceType: 'ClusterIP', restartPolicy: 'Always'
});

const TemplatesPage = () => {
    const { t } = useTranslation();
    const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<DeploymentTemplateRequest>(defaultForm(''));
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<DeploymentTemplate | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const user = getStoredUser();
            const result = await k8sService.listTemplatesPaginated(page, PAGE_SIZE, user?.tenantId);
            setTemplates(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Failed to load templates'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return templates;
        return templates.filter((t) => [t.name, t.description, t.dockerImage].join(' ').toLowerCase().includes(q));
    }, [templates, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const openCreate = () => {
        const user = getStoredUser();
        setEditingId(null);
        setForm(defaultForm(user?.tenantId ?? ''));
        setDialogOpen(true);
    };

    const openEdit = (tpl: DeploymentTemplate) => {
        setEditingId(tpl.id);
        setForm({
            name: tpl.name, description: tpl.description || '', dockerImage: tpl.dockerImage,
            port: tpl.port, tenantId: tpl.tenantId,
            cpuLimit: tpl.cpuLimit || '', memoryLimit: tpl.memoryLimit || '',
            cpuRequest: tpl.cpuRequest || '', memoryRequest: tpl.memoryRequest || '',
            envVars: tpl.envVars || '', labels: tpl.labels || '',
            protocol: tpl.protocol || 'TCP', imagePullPolicy: tpl.imagePullPolicy || 'IfNotPresent',
            serviceType: tpl.serviceType || 'ClusterIP', restartPolicy: tpl.restartPolicy || 'Always',
            livenessProbe: tpl.livenessProbe || '', readinessProbe: tpl.readinessProbe || '',
            startupProbe: tpl.startupProbe || ''
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error('Name is required');
        if (!form.dockerImage.trim()) return toast.error('Docker image is required');
        setSaving(true);
        try {
            if (editingId) {
                await k8sService.updateTemplate(editingId, form);
                toast.success('Template updated');
            } else {
                await k8sService.createTemplate(form);
                toast.success('Template created');
            }
            setDialogOpen(false);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to save template'));
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.deleteTemplate(deleteTarget.id);
            toast.success('Template deleted');
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete template'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #5FB985, #3F9B66)', mb: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #5FB985, #3F9B66)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(95,185,133,0.3)' }}>
                        <TemplateIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>Deployment Templates</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{totalElements} templates</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton onClick={() => load()} disabled={loading} sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}>
                                <RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <MyCustomButton startIcon={<AddIcon />} onClick={openCreate} sx={{ px: 2.5 }}>New Template</MyCustomButton>
                </Box>
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 3 }}>
                <CardContent sx={{ py: '14px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." sx={{ flex: 1 }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : null } }} />
                        <Chip label={`${filtered.length} / ${totalElements}`} size="small" sx={{ backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 12 }} />
                    </Box>
                </CardContent>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
                {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </Box>}

            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <TemplateIcon sx={{ fontSize: 48, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>No templates</Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>Create your first deployment template</Typography>
                        <MyCustomButton startIcon={<AddIcon />} onClick={openCreate}>New Template</MyCustomButton>
                    </Card>
                </Fade>
            )}

            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                    {filtered.map((tpl) => (
                        <Card key={tpl.id} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: '#fff', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } }}>
                            <Box sx={{ height: 4, background: 'linear-gradient(90deg, #5FB985, #3F9B66)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <TemplateIcon sx={{ color: '#065F46', fontSize: 20 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{tpl.name}</Typography>
                                        <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.2 }}>{tpl.description || '-'}</Typography>
                                        <Typography sx={{ color: C.subtle, fontFamily: 'monospace', fontSize: 11, mt: 1 }}>{tpl.dockerImage}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip label={`Port ${tpl.port}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />
                                    {tpl.cpuLimit && <Chip label={`CPU: ${tpl.cpuLimit}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />}
                                    {tpl.memoryLimit && <Chip label={`Mem: ${tpl.memoryLimit}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />}
                                    <Chip label={tpl.protocol} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#E4EEF7', color: '#2E5C8A' }} />
                                </Box>
                                {tpl.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1 }}>Created: {fmtDate(tpl.createdAt)}</Typography>}
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1.5, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, background: '#FAFAFA', gap: 0.5 }}>
                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(tpl)} sx={{ color: '#065F46' }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(tpl)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{editingId ? 'Edit Template' : 'New Template'}</span>
                    <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
                        <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                        <TextField size="small" label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} multiline rows={2} />
                        <TextField size="small" label="Docker Image" value={form.dockerImage} onChange={(e) => setForm((p) => ({ ...p, dockerImage: e.target.value }))} required placeholder="nginx:1.25" />
                        <TextField size="small" type="number" label="Port" value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))} slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" label="CPU Request" value={form.cpuRequest} onChange={(e) => setForm((p) => ({ ...p, cpuRequest: e.target.value }))} placeholder="500m" />
                            <TextField size="small" label="CPU Limit" value={form.cpuLimit} onChange={(e) => setForm((p) => ({ ...p, cpuLimit: e.target.value }))} placeholder="1" />
                            <TextField size="small" label="Memory Request" value={form.memoryRequest} onChange={(e) => setForm((p) => ({ ...p, memoryRequest: e.target.value }))} placeholder="512Mi" />
                            <TextField size="small" label="Memory Limit" value={form.memoryLimit} onChange={(e) => setForm((p) => ({ ...p, memoryLimit: e.target.value }))} placeholder="1Gi" />
                        </Box>
                        <TextField size="small" select label="Protocol" value={form.protocol} onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}>
                            {PROTOCOLS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" select label="Image Pull" value={form.imagePullPolicy} onChange={(e) => setForm((p) => ({ ...p, imagePullPolicy: e.target.value }))}>
                                {IMAGE_PULL_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                            <TextField size="small" select label="Service Type" value={form.serviceType} onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}>
                                {SERVICE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                            <TextField size="small" select label="Restart Policy" value={form.restartPolicy} onChange={(e) => setForm((p) => ({ ...p, restartPolicy: e.target.value }))}>
                                {RESTART_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                        </Box>
                        <TextField size="small" label="Labels" value={form.labels} onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))} placeholder="app=web,version=v1" helperText="Comma-separated key=value" />
                        <TextField size="small" label="Environment Variables" value={form.envVars} onChange={(e) => setForm((p) => ({ ...p, envVars: e.target.value }))} placeholder="KEY1=val1,KEY2=val2" multiline rows={2} helperText="Comma-separated KEY=value pairs" />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <MyCustomButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Template</DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>Delete "{deleteTarget?.name}"?</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TemplatesPage;
