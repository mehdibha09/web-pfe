import {
    Add as AddIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Storage as StorageIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Fade,
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

import type { EnvironmentResponse } from '../../../services/devopsService';
import {
    deleteEnvironment,
    listEnvironmentsPaginated,
    updateEnvironment
} from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { C } from '../../../theme/tokens';
import PaginationBar from '../../../components/PaginationBar';
import CreateEnvForm from './CreateEnvForm';
import DeleteEnvDialog from './DeleteEnvDialog';
import EnvCard from './EnvCard';

const EnvSkeleton = () => (
    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}` }}>
        <CardContent>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="90%" sx={{ mt: 1 }} />
            <Skeleton variant="text" width="80%" />
        </CardContent>
    </Card>
);

const EnvironmentsPage = () => {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);

    const [search, setSearch] = useState('');
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<EnvironmentResponse | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const res = await listEnvironmentsPaginated(page, PAGE_SIZE);
            setEnvironments(res.items);
            setTotalElements(res.total);
        } catch (e: unknown) {
            const msg = getErrorMessage(e, t('environments.failedToLoad'));
            setError(msg);
            if (quiet) toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return environments;
        return environments.filter((e) =>
            [e.name, e.description, e.tenantId, e.id].join(' ').toLowerCase().includes(q)
        );
    }, [environments, search]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const tenantId = getStoredUser()?.tenantId || '';

    const startEdit = (e: EnvironmentResponse) => {
        setEditingId(e.id);
        setEditName(e.name);
        setEditDescription(e.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDescription('');
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return toast.error(t('environments.nameRequired'));
        if (!tenantId) return toast.error(t('environments.tenantIdRequired'));
        setSaving(true);
        try {
            await updateEnvironment(id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
                tenantId
            });
            toast.success(t('environments.updated'));
            cancelEdit();
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('environments.failedToUpdate')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteEnvironment(deleteTarget.id);
            toast.success(t('environments.deleted', { name: deleteTarget.name }));
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('environments.failedToDelete')));
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                background: 'linear-gradient(180deg, #FFF3F8 0%, #ffffff 100%)',
                minHeight: '100%'
            }}
        >
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 3 }} />
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                {t('environments.helperText')}
            </Alert>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    mb: 4,
                    flexWrap: 'wrap',
                    gap: 2
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(228,71,125,0.3)'
                        }}
                    >
                        <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                            {t('environments.title')}
                        </Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>
                            {t('environments.subtitle', { count: totalElements, tenantId: environments[0]?.tenantId.slice(0, 8) })}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={t('common.refresh')}>
                        <span>
                            <IconButton
                                onClick={() => load()}
                                disabled={loading}
                                sx={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.surface }}
                            >
                                <RefreshIcon sx={{ fontSize: 18, color: loading ? C.subtle : C.muted }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                        sx={{
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                            borderRadius: 2,
                            fontWeight: 700,
                            px: 2.5,
                            boxShadow: '0 4px 12px rgba(228,71,125,0.3)',
                            '&:hover': { boxShadow: '0 6px 16px rgba(228,71,125,0.4)' }
                        }}
                    >
                        {t('environments.newEnvironment')}
                    </Button>
                </Box>
            </Box>

            <CreateEnvForm open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => load(true)} />

            <Card
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${C.border}`,
                    mb: 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
            >
                <CardContent sx={{ py: '14px !important' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('environments.searchPlaceholder')}
                            sx={{ flex: 1, minWidth: 220 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: C.subtle, fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: search ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearch('')}>
                                                <CloseIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null
                                }
                            }}
                        />
                        <Chip
                            label={`${filtered.length} / ${totalElements}`}
                            size="small"
                            sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, fontSize: 12 }}
                        />
                    </Box>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <EnvSkeleton key={i} />
                    ))}
                </Box>
            )}

            {!loading && filtered.length === 0 && (
                <Fade in>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
                        <StorageIcon sx={{ fontSize: 48, color: C.subtle, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {search ? t('environments.noResultsFound') : t('environments.noEnvironmentsYet')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.5, mb: 3 }}>
                            {search
                                ? t('environments.noResultsMessage', { search })
                                : t('environments.createFirstEnvironment')}
                        </Typography>
                        {!search && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateOpen(true)}
                                sx={{
                                    background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                                    fontWeight: 700
                                }}
                            >
                                {t('environments.newEnvironment')}
                            </Button>
                        )}
                    </Card>
                </Fade>
            )}

            {!loading && filtered.length > 0 && (
                <>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
                        gap: 2.5
                    }}
                >
                    {filtered.map((env) => (
                        <EnvCard
                            key={env.id}
                            env={env}
                            isEditing={editingId === env.id}
                            editName={editName}
                            setEditName={setEditName}
                            editDescription={editDescription}
                            setEditDescription={setEditDescription}
                            saving={saving}
                            onSave={handleUpdate}
                            onEdit={startEdit}
                            onCancelEdit={cancelEdit}
                            startEdit={startEdit}
                            cancelEdit={cancelEdit}
                            onDelete={(e) => setDeleteTarget(e)}
                        />
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <DeleteEnvDialog
                open={!!deleteTarget}
                name={deleteTarget?.name ?? ''}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </Box>
    );
};

export default EnvironmentsPage;
