import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
    Skeleton,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { k8sService } from '../../../services/k8sService';
import type { K8sNamespaceResponse } from '../../../services/interfaces/k8s';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { canManageNamespaces } from '../../../services/authorization';
import PaginationBar from '../../../components/PaginationBar';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useInlineErrors } from '../../../hooks/useInlineErrors';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    Active: { bg: '#E0F1E6', color: '#2E7A4F' },
    Terminating: { bg: '#F7DEE3', color: '#A23B4E' },
};

const NamespacesPage = () => {
    const { t } = useTranslation();
    const { errors, setFieldError, clearFieldError } = useInlineErrors();
    const [namespaces, setNamespaces] = useState<K8sNamespaceResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 9;
    const currentUser = getStoredUser();
    const allowManage = currentUser ? canManageNamespaces(currentUser) : false;

    const load = async () => {
        setLoading(true);
        try {
            const result = await k8sService.listNamespacesPaginated(page, PAGE_SIZE);
            setNamespaces(result.items);
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

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleCreate = async () => {
        if (!newName.trim()) {
            setFieldError('name', t('k8s.namespaces.nameRequired'));
            return;
        }
        setCreating(true);
        try {
            await k8sService.createNamespace({ name: newName.trim() });
            toast.success(t('common.success'));
            setCreateOpen(false);
            setNewName('');
            clearFieldError('name');
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!window.confirm(`Delete namespace "${name}"? This will remove all resources inside.`)) return;
        try {
            await k8sService.deleteNamespace(name);
            toast.success(t('common.success'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('common.error')));
        }
    };

    const activeCount = useMemo(() => namespaces.filter((ns) => ns.status === 'Active').length, [namespaces]);

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('k8s.namespaces.title')}
                    </Typography>
                    <Typography sx={{ color: C.muted }}>{t('k8s.namespaces.subtitle')}</Typography>
                </Box>
                {allowManage && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateOpen(true); clearFieldError('name'); }} sx={{ fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                    {t('k8s.namespaces.create')}
                </Button>
                )}
            </Box>

            {currentUser && (
                <Card sx={{ borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', border: `1px solid #F9A8C9` }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg, #E4477D, #BE185D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AccountTreeIcon sx={{ color: '#fff', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 700, color: C.text }}>
                                {t('k8s.namespaces.currentTenant')}
                            </Typography>
                            <Typography sx={{ color: C.muted, fontSize: 14 }}>
                                {currentUser.tenantName}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {!loading && namespaces.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
                    <Card sx={{ borderRadius: 3, background: '#F4F0FA' }}>
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#5E4B9E', lineHeight: 1.1 }}>
                                        {totalElements}
                                    </Typography>
                                    <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                        {t('k8s.namespaces.total')}
                                    </Typography>
                                </Box>
                                <DnsIcon sx={{ fontSize: 28, color: '#5E4B9E' }} />
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ borderRadius: 3, background: '#E0F1E6' }}>
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#2E7A4F', lineHeight: 1.1 }}>
                                        {activeCount}
                                    </Typography>
                                    <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                        {t('k8s.namespaces.active')}
                                    </Typography>
                                </Box>
                                <DnsIcon sx={{ fontSize: 28, color: '#2E7A4F' }} />
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ borderRadius: 3, background: '#F7DEE3' }}>
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#A23B4E', lineHeight: 1.1 }}>
                                        {namespaces.length - activeCount}
                                    </Typography>
                                    <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                        {t('k8s.namespaces.terminating')}
                                    </Typography>
                                </Box>
                                <DnsIcon sx={{ fontSize: 28, color: '#A23B4E' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    size="small"
                    placeholder={t('k8s.namespaces.search')}
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
                                {t('k8s.namespaces.clusterUnavailable')}
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
                                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                                    <Skeleton variant="rounded" height={36} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : namespaces.length === 0 ? (
                <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                            {namespaces.length === 0 ? t('k8s.namespaces.noNamespaces') : t('k8s.namespaces.noResults')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted, mb: 2 }}>
                            {namespaces.length === 0 ? t('k8s.namespaces.createFirst') : t('k8s.namespaces.adjustSearch')}
                        </Typography>
                        {namespaces.length === 0 && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateOpen(true); clearFieldError('name'); }} sx={{ background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>
                                {t('k8s.namespaces.create')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                <Grid container spacing={2}>
                    {namespaces.map((ns) => {
                        const sc = STATUS_COLORS[ns.status] || { bg: C.brandLight, color: C.brand };
                        return (
                            <Grid key={ns.name} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                                <Card sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontFamily: 'monospace', fontSize: 15 }}>
                                                {ns.name}
                                            </Typography>
                                            <Chip
                                                label={ns.status}
                                                size="small"
                                                sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 700, height: 24 }}
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                            {Object.entries(ns.labels).slice(0, 4).map(([k, v]) => (
                                                <Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined" sx={{ borderColor: C.border, color: C.muted, fontWeight: 600, fontSize: 11 }} />
                                            ))}
                                            {Object.keys(ns.labels).length > 4 && (
                                                <Chip label={`+${Object.keys(ns.labels).length - 4}`} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                                            )}
                                        </Box>

                                        <Typography variant="caption" sx={{ color: C.muted, display: 'block', mb: 2 }}>
                                            {ns.createdAt ? new Date(ns.createdAt).toLocaleString() : ''}
                                        </Typography>

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {allowManage && (
                                            <Tooltip title={t('common.delete')!}>
                                                <IconButton size="small" color="error" onClick={() => handleDelete(ns.name)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1 }} />
                                </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, background: 'linear-gradient(135deg, #FCE7F3, #FDEAF2)', borderBottom: `1px solid ${C.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FCE7F3, #F9D7E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <DnsIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: C.text }}>{t('k8s.namespaces.create')}</Typography>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{t('k8s.namespaces.subtitle')}</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('common.name')}
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); clearFieldError('name'); }}
                        placeholder={t('k8s.namespaces.create')}
                        error={Boolean(errors.name)}
                        helperText={errors.name}
                        sx={{ mt: 1.5 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button onClick={() => setCreateOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                    <Button onClick={handleCreate} variant="contained" disabled={creating} sx={{ borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' }, '&.Mui-disabled': { background: '#FCE7F3' } }}>
                        {creating ? t('k8s.namespaces.creating') : t('k8s.namespaces.create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NamespacesPage;