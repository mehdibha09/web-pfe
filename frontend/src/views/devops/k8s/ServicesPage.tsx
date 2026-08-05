import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
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
import type { K8sServiceResponse } from '../../../services/interfaces/k8s';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { numericFieldValue } from '../../../utils/numeric';
import { getStoredUser } from '../../../services/authStorage';
import { canManageK8s } from '../../../services/authorization';
import { SERVICE_TYPES } from './constants';
import { useInlineErrors } from '../../../hooks/useInlineErrors';
import PaginationBar from '../../../components/PaginationBar';

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    ClusterIP: { bg: '#FCE7F3', color: '#BE185D' },
    NodePort: { bg: '#F7ECD6', color: '#8A6A2E' },
    LoadBalancer: { bg: '#D1FAE5', color: '#065F46' },
    ExternalName: { bg: '#E9E6F6', color: '#5E4B9E' },
};

const ServicesPage = () => {
    const { t } = useTranslation();
    const { errors, setFieldError, clearFieldError } = useInlineErrors();
    const [services, setServices] = useState<K8sServiceResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<K8sServiceResponse | null>(null);

    // form fields
    const [svcName, setSvcName] = useState('');
    const [svcType, setSvcType] = useState('ClusterIP');
    const [svcPort, setSvcPort] = useState(80);
    const [svcTargetPort, setSvcTargetPort] = useState(8080);
    const [svcProtocol, setSvcProtocol] = useState('TCP');
    const [svcSelectorKey, setSvcSelectorKey] = useState('app');
    const [svcSelectorValue, setSvcSelectorValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 9;
    const allowManage = canManageK8s(getStoredUser()!);

    const load = async () => {
        setLoading(true);
        try {
            const result = await k8sService.listServicesPaginated(page, PAGE_SIZE);
            setServices(result.items);
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

    const totalCount = services.length;
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const s of services) {
            counts[s.type] = (counts[s.type] || 0) + 1;
        }
        return counts;
    }, [services]);

    const openCreate = () => {
        setEditing(null);
        setSvcName('');
        setSvcType('ClusterIP');
        setSvcPort(80);
        setSvcTargetPort(8080);
        setSvcProtocol('TCP');
        setSvcSelectorKey('app');
        setSvcSelectorValue('');
        clearFieldError('name');
        setDialogOpen(true);
    };

    const openEdit = (svc: K8sServiceResponse) => {
        setEditing(svc);
        setSvcName(svc.name);
        setSvcType(svc.type);
        setSvcPort(svc.ports[0]?.port || 80);
        setSvcTargetPort(svc.ports[0]?.targetPort || 8080);
        setSvcProtocol(svc.ports[0]?.protocol || 'TCP');
        const selEntry = Object.entries(svc.selector)[0] || ['app', ''];
        setSvcSelectorKey(selEntry[0]);
        setSvcSelectorValue(selEntry[1]);
        clearFieldError('name');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!svcName.trim()) {
            setFieldError('name', t('k8s.services.nameRequired'));
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: svcName.trim(),
                type: svcType,
                port: svcPort,
                targetPort: svcTargetPort,
                protocol: svcProtocol,
                selector: { [svcSelectorKey]: svcSelectorValue || svcName.trim() },
            };
            if (editing) {
                await k8sService.updateService(editing.name, payload);
                toast.success(t('common.success'));
            } else {
                await k8sService.createService(payload);
                toast.success(t('common.success'));
            }
            setDialogOpen(false);
            clearFieldError('name');
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (name: string, namespace: string) => {
        if (!window.confirm(`Delete service "${name}" in namespace "${namespace}"?`)) return;
        try {
            await k8sService.deleteService(name, namespace);
            toast.success(t('common.success'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        }
    };

    const kpiCards = [
        { label: t('k8s.services.total'), value: totalCount, bg: '#F4F0FA', color: '#5E4B9E' },
        { label: 'ClusterIP', value: typeCounts['ClusterIP'] || 0, bg: '#FCE7F3', color: '#BE185D' },
        { label: 'NodePort', value: typeCounts['NodePort'] || 0, bg: '#F7ECD6', color: '#8A6A2E' },
        { label: 'LoadBalancer', value: typeCounts['LoadBalancer'] || 0, bg: '#D1FAE5', color: '#065F46' },
    ];

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('k8s.services.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted }}>{t('k8s.services.subtitle')}</Typography>
                </Box>
                {allowManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                    {t('k8s.services.create')}
                </Button>}
            </Box>

            {!loading && services.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                    {kpiCards.map((kpi) => (
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
                    placeholder={t('k8s.services.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: C.subtle, fontSize: 20 }} />
                                </InputAdornment>
                            )
                        }
                    }}
                    sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, background: C.surface } }}
                />
            </Box>

            {loadError && !loading && (
                <Card sx={{ borderRadius: 3, mb: 3, bgcolor: '#F7DEE3', border: '1px solid #C95B6E' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: 28 }}>⚠</Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#A23B4E' }}>
                                {t('k8s.services.clusterUnavailable')}
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
                    {[1, 2, 3, 4].map((i) => (
                        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Skeleton variant="text" width="60%" height={28} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                    <Skeleton variant="text" width="80%" height={20} />
                                    <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : services.length === 0 ? (
                <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                            {services.length === 0 ? t('k8s.services.noServices') : t('k8s.services.noResults')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2 }}>
                            {services.length === 0 ? t('k8s.services.createFirst') : t('k8s.services.adjustSearch')}
                        </Typography>
                        {services.length === 0 && allowManage && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                                {t('k8s.services.create')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (<>
                <Grid container spacing={2}>
                    {services.map((svc) => {
                        const tc = TYPE_COLORS[svc.type] || { bg: C.brandLight, color: C.brand };
                        return (
                            <Grid key={`${svc.namespace}/${svc.name}`} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                                <Card sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontFamily: 'monospace', fontSize: 15, wordBreak: 'break-all' }}>
                                                {svc.name}
                                            </Typography>
                                            <Chip label={svc.type} size="small" sx={{ backgroundColor: tc.bg, color: tc.color, fontWeight: 700, height: 24 }} />
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                            <Chip label={svc.namespace} size="small" variant="outlined" sx={{ borderColor: C.border, fontWeight: 600, fontSize: 11 }} />
                                        </Box>

                                        {svc.clusterIp && (
                                            <Typography variant="body2" sx={{ color: C.muted, mb: 0.5, fontFamily: 'monospace', fontSize: 12 }}>
                                                ClusterIP: {svc.clusterIp}
                                            </Typography>
                                        )}

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                                            {svc.ports.map((p, i) => (
                                                <Typography key={i} variant="body2" sx={{ color: C.text, fontFamily: 'monospace', fontSize: 12 }}>
                                                    {p.protocol} {p.port}:{p.targetPort}{p.nodePort ? ` (NodePort: ${p.nodePort})` : ''}
                                                </Typography>
                                            ))}
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                            {Object.entries(svc.selector).map(([k, v]) => (
                                                <Chip key={k} label={`${k}=${v}`} size="small" sx={{ backgroundColor: '#FCE7F3', color: '#BE185D', fontWeight: 600, fontSize: 11, height: 22 }} />
                                            ))}
                                        </Box>

                                        <Typography variant="caption" sx={{ color: C.muted, display: 'block' }}>
                                            {svc.createdAt ? new Date(svc.createdAt).toLocaleString() : ''}
                                        </Typography>

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                                            {allowManage && (
                                                <>
                                                    <Tooltip title={t('common.edit')!}>
                                                        <IconButton size="small" onClick={() => openEdit(svc)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('common.delete')!}>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(svc.name, svc.namespace)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1 }} />
                                </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
                <PaginationBar page={page + 1} pageCount={Math.max(1, Math.ceil(totalElements / PAGE_SIZE))} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <StorageIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>
                                    {editing ? t('k8s.services.editTitle', { name: editing.name }) : t('k8s.services.create')}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{t('k8s.services.subtitle')}</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <TextField fullWidth label={t('common.name')} value={svcName} onChange={(e) => { setSvcName(e.target.value); clearFieldError('name'); }} disabled={!!editing} error={Boolean(errors.name)} helperText={errors.name} />
                        <TextField select fullWidth label={t('common.type')} value={svcType} onChange={(e) => setSvcType(e.target.value)}>
                            {SERVICE_TYPES.map((st) => (
                                <MenuItem key={st} value={st}>{st}</MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField fullWidth type="number" label="Port" value={svcPort} onChange={(e) => setSvcPort(Number(numericFieldValue(e.target.value)))} slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                            <TextField fullWidth type="number" label="Target Port" value={svcTargetPort} onChange={(e) => setSvcTargetPort(Number(numericFieldValue(e.target.value)))} slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                        </Box>
                        <TextField select fullWidth label={t('k8s.protocol')} value={svcProtocol} onChange={(e) => setSvcProtocol(e.target.value)}>
                            <MenuItem value="TCP">TCP</MenuItem>
                            <MenuItem value="UDP">UDP</MenuItem>
                            <MenuItem value="HTTP">HTTP</MenuItem>
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField fullWidth label="Selector Key" value={svcSelectorKey} onChange={(e) => setSvcSelectorKey(e.target.value)} placeholder="e.g. app" />
                            <TextField fullWidth label="Selector Value" value={svcSelectorValue} onChange={(e) => setSvcSelectorValue(e.target.value)} placeholder="e.g. my-app" />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' }, '&.Mui-disabled': { background: '#FCE7F3' } }}>
                        {saving ? t('k8s.services.saving') : (editing ? t('common.save') : t('k8s.services.create'))}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ServicesPage;