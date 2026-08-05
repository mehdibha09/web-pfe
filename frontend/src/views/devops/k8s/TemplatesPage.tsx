import {
    Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Description as TemplateIcon,
    Edit as EditIcon, Lock as LockIcon, Public as PublicIcon, Refresh as RefreshIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Alert, Box, Button, Card, CardContent, CardActions, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, Fade, FormControlLabel, IconButton, InputAdornment,
    MenuItem, Radio, RadioGroup, Skeleton, TextField, Tooltip, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getStoredUser } from '../../../services/authStorage';
import { canManageK8s } from '../../../services/authorization';
import type { DeploymentTemplate, DeploymentTemplateRequest } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { numericFieldValue } from '../../../utils/numeric';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { C, fmtDate, PROTOCOLS, IMAGE_PULL_POLICIES, SERVICE_TYPES, RESTART_POLICIES } from './constants';
import { useInlineErrors } from '../../../hooks/useInlineErrors';

const SkeletonCard = () => (
    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}` }}>
        <CardContent><Skeleton variant="text" width="60%" height={28} /><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="80%" sx={{ mt: 1 }} /></CardContent>
    </Card>
);

const defaultForm = (tenantId: string): DeploymentTemplateRequest => ({
    name: '', description: '', dockerImage: '', port: 80, tenantId,
    protocol: 'TCP', imagePullPolicy: 'IfNotPresent', serviceType: 'ClusterIP', restartPolicy: 'Always',
    publicTemplate: false
});

const TemplatesPage = () => {
    const { t } = useTranslation();
    const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<DeploymentTemplateRequest>(defaultForm(''));
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<DeploymentTemplate | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const allowManage = canManageK8s(getStoredUser()!);
    const { errors, setFieldError, clearFieldError } = useInlineErrors();

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const user = getStoredUser();
            const result = await k8sService.listTemplatesPaginated(page, PAGE_SIZE, user?.tenantId);
            setTemplates(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            setError(getErrorMessage(e, t('k8s.templates.saveFailed')));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return templates.filter((tl) => {
            const matchesSearch = !q || [tl.name, tl.description, tl.dockerImage].join(' ').toLowerCase().includes(q);
            const isPublic = !!tl.publicTemplate;
            const matchesVis = visibilityFilter === '' || (visibilityFilter === 'PUBLIC' ? isPublic : !isPublic);
            return matchesSearch && matchesVis;
        });
    }, [templates, search, visibilityFilter]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const openCreate = () => {
        const user = getStoredUser();
        setEditingId(null);
        setForm(defaultForm(user?.tenantId ?? ''));
        clearFieldError('name');
        clearFieldError('dockerImage');
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
            startupProbe: tpl.startupProbe || '',
            publicTemplate: !!tpl.publicTemplate
        });
        clearFieldError('name');
        clearFieldError('dockerImage');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setFieldError('name', t('k8s.templates.nameRequired'));
            return;
        }
        if (!form.dockerImage.trim()) {
            setFieldError('dockerImage', t('k8s.templates.dockerRequired'));
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await k8sService.updateTemplate(editingId, form);
                toast.success(t('k8s.templates.updatedToast'));
            } else {
                await k8sService.createTemplate(form);
                toast.success(t('k8s.templates.createdToast'));
            }
            setDialogOpen(false);
            clearFieldError('name');
            clearFieldError('dockerImage');
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('k8s.templates.saveFailed')));
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await k8sService.deleteTemplate(deleteTarget.id);
            toast.success(t('k8s.templates.deletedToast'));
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('k8s.templates.deleteFailed')));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #BE185D, #9D174D)', mb: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #BE185D, #9D174D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(190,24,93,0.3)' }}>
                        <TemplateIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.templates.title')}</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{t('k8s.templates.subtitle')}</Typography>
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
                    {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={openCreate} sx={{ px: 2.5 }}>{t('k8s.templates.new')}</MyCustomButton>}
                </Box>
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 3 }}>
                <CardContent sx={{ py: '14px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('k8s.templates.search')} sx={{ flex: 1, minWidth: 200 }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: C.subtle, fontSize: 18 }} /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></InputAdornment> : null } }} />
                        <TextField
                            size="small"
                            select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            slotProps={{ select: { displayEmpty: true } }}
                            sx={{ minWidth: 170 }}
                        >
                            <MenuItem value="">{t('k8s.templates.public')} + {t('k8s.templates.private')}</MenuItem>
                            <MenuItem value="PUBLIC"><PublicIcon sx={{ fontSize: 16, mr: 0.5 }} /> {t('k8s.templates.public')}</MenuItem>
                            <MenuItem value="PRIVATE"><LockIcon sx={{ fontSize: 16, mr: 0.5 }} /> {t('k8s.templates.private')}</MenuItem>
                        </TextField>
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
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('k8s.templates.noTemplates')}</Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>{t('k8s.templates.createFirst')}</Typography>
                        {allowManage && <MyCustomButton startIcon={<AddIcon />} onClick={openCreate}>{t('k8s.templates.new')}</MyCustomButton>}
                    </Card>
                </Fade>
            )}

            {!loading && filtered.length > 0 && (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                    {filtered.map((tpl) => {
                        const isPublic = !!tpl.publicTemplate;
                        return (
                        <Card key={tpl.id} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } }}>
                            <Box sx={{ height: 4, background: isPublic ? 'linear-gradient(90deg, #E4477D, #BE185D)' : 'linear-gradient(90deg, #5FB985, #3F9B66)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                            <CardContent sx={{ p: 2.5, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, background: isPublic ? '#FCE7F3' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {isPublic ? <PublicIcon sx={{ color: '#BE185D', fontSize: 20 }} /> : <TemplateIcon sx={{ color: '#065F46', fontSize: 20 }} />}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{tpl.name}</Typography>
                                            <Chip
                                                icon={isPublic ? <PublicIcon sx={{ fontSize: 12 }} /> : <LockIcon sx={{ fontSize: 12 }} />}
                                                label={isPublic ? t('k8s.templates.public') : t('k8s.templates.private')}
                                                size="small"
                                                sx={{ height: 20, fontSize: 9, fontWeight: 700, backgroundColor: isPublic ? '#FCE7F3' : '#D1FAE5', color: isPublic ? '#BE185D' : '#065F46' }}
                                            />
                                        </Box>
                                        <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.2 }}>{tpl.description || '-'}</Typography>
                                        <Typography sx={{ color: C.subtle, fontFamily: 'monospace', fontSize: 11, mt: 1 }}>{tpl.dockerImage}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip label={`${t('k8s.templates.port')} ${tpl.port}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />
                                    {tpl.cpuLimit && <Chip label={`CPU: ${tpl.cpuLimit}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />}
                                    {tpl.memoryLimit && <Chip label={`Mem: ${tpl.memoryLimit}`} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />}
                                    <Chip label={tpl.protocol} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#FCE7F3', color: '#BE185D' }} />
                                </Box>
                                {tpl.createdAt && <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1 }}>{t('k8s.templates.createdAt')}: {fmtDate(tpl.createdAt)}</Typography>}
                            </CardContent>
                            <CardActions sx={{ px: 2.5, py: 1.5, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, background: '#FAFAFA', gap: 0.5 }}>
                                {allowManage && (
                                    <>
                                        <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(tpl)} sx={{ color: '#065F46' }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                        <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => setDeleteTarget(tpl)} sx={{ color: C.danger }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
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
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <TemplateIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, color: C.text }}>{editingId ? t('k8s.templates.edit') : t('k8s.templates.new')}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TemplateIcon sx={{ fontSize: 16, color: '#BE185D' }} /> {t('k8s.templates.templateInfo')}
                        </Typography>
                        <TextField size="small" label={t('k8s.templates.name')} value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); clearFieldError('name'); }} required error={Boolean(errors.name)} helperText={errors.name} />
                        <TextField size="small" label={t('k8s.templates.description')} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} multiline rows={2} />
                        <TextField size="small" label={t('k8s.templates.dockerImage')} value={form.dockerImage} onChange={(e) => { setForm((p) => ({ ...p, dockerImage: e.target.value })); clearFieldError('dockerImage'); }} required placeholder="nginx:1.25" error={Boolean(errors.dockerImage)} helperText={errors.dockerImage} />

                        <Divider sx={{ my: 0.5 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PublicIcon sx={{ fontSize: 16, color: '#BE185D' }} /> {t('k8s.templates.visibility')}
                        </Typography>
                        <RadioGroup
                            row
                            value={form.publicTemplate ? 'PUBLIC' : 'PRIVATE'}
                            onChange={(e) => setForm((p) => ({ ...p, publicTemplate: e.target.value === 'PUBLIC' }))}
                        >
                            <FormControlLabel value="PRIVATE" control={<Radio size="small" />} label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LockIcon sx={{ fontSize: 16, color: '#065F46' }} /> {t('k8s.templates.private')}
                                </Box>
                            } />
                            <FormControlLabel value="PUBLIC" control={<Radio size="small" />} label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PublicIcon sx={{ fontSize: 16, color: '#BE185D' }} /> {t('k8s.templates.public')}
                                </Box>
                            } />
                        </RadioGroup>
                        <Typography variant="caption" sx={{ color: C.muted }}>
                            {t('k8s.templates.visibilityHint')}
                        </Typography>

                        <Divider sx={{ my: 0.5 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.templates.resources')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                            <TextField size="small" label={t('k8s.templates.cpuRequest')} value={form.cpuRequest} onChange={(e) => setForm((p) => ({ ...p, cpuRequest: e.target.value }))} placeholder="500m" />
                            <TextField size="small" label={t('k8s.templates.cpuLimit')} value={form.cpuLimit} onChange={(e) => setForm((p) => ({ ...p, cpuLimit: e.target.value }))} placeholder="1" />
                            <TextField size="small" label={t('k8s.templates.memoryRequest')} value={form.memoryRequest} onChange={(e) => setForm((p) => ({ ...p, memoryRequest: e.target.value }))} placeholder="512Mi" />
                            <TextField size="small" label={t('k8s.templates.memoryLimit')} value={form.memoryLimit} onChange={(e) => setForm((p) => ({ ...p, memoryLimit: e.target.value }))} placeholder="1Gi" />
                        </Box>

                        <Divider sx={{ my: 0.5 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.templates.networking')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <TextField size="small" type="number" label={t('k8s.templates.port')} value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: Number(numericFieldValue(e.target.value)) }))} slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                            <TextField size="small" select label={t('k8s.templates.protocol')} value={form.protocol} onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}>
                                {PROTOCOLS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                            <TextField size="small" select label={t('k8s.templates.serviceType')} value={form.serviceType} onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}>
                                {SERVICE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                            <TextField size="small" select label={t('k8s.templates.imagePullPolicy')} value={form.imagePullPolicy} onChange={(e) => setForm((p) => ({ ...p, imagePullPolicy: e.target.value }))}>
                                {IMAGE_PULL_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                            <TextField size="small" select label={t('k8s.templates.restartPolicy')} value={form.restartPolicy} onChange={(e) => setForm((p) => ({ ...p, restartPolicy: e.target.value }))}>
                                {RESTART_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                        </Box>

                        <Divider sx={{ my: 0.5 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.text }}>{t('k8s.templates.configData')}</Typography>
                        <TextField size="small" label={t('k8s.templates.labels')} value={form.labels} onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))} placeholder="app=web,version=v1" helperText={t('k8s.templates.labelsHint')} />
                        <TextField size="small" label={t('k8s.templates.envVars')} value={form.envVars} onChange={(e) => setForm((p) => ({ ...p, envVars: e.target.value }))} placeholder="KEY1=val1,KEY2=val2" multiline rows={2} helperText={t('k8s.templates.envVarsHint')} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDialogOpen(false)}>{t('k8s.templates.cancel')}</Button>
                    <MyCustomButton onClick={handleSave} disabled={saving}>{saving ? t('k8s.templates.creating') : editingId ? t('k8s.templates.save') : t('common.create')}</MyCustomButton>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>{t('k8s.templates.deleteTitle')}</DialogTitle>
                <DialogContent><Typography sx={{ color: C.muted }}>{t('k8s.templates.deleteConfirm', { name: deleteTarget?.name })}</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setDeleteTarget(null)}>{t('k8s.templates.cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TemplatesPage;
