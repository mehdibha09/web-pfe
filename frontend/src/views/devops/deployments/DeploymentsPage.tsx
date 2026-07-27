import {
    Alert, Box, Card, CardContent, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, Typography
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type {
    DeploymentResponse,
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import {
    createDeployment,
    deleteDeployment,
    listDeployments,
    listDeploymentsPaginated,
    listEnvironments,
    listServiceEnvironments,
    listServices,
    redeployDeployment,
    updateDeployment
} from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';

import CreateDeploymentForm from './CreateDeploymentForm';
import DeploymentCard from './DeploymentCard';
import DeploymentFilters from './DeploymentFilters';
import DeploymentStats from './DeploymentStats';
import { C} from '../../../theme/tokens';

const DeploymentsPage = () => {
    const { t } = useTranslation();
    // ── Data ──────────────────────────────────────────────────────────────────
    const [deployments, setDeployments] = useState<DeploymentResponse[]>([]);
    const [allDeployments, setAllDeployments] = useState<DeploymentResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Create form ───────────────────────────────────────────────────────────
    const [version, setVersion] = useState('1.0.0');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<string>('PENDING');
    const [serviceEnvironmentId, setServiceEnvironmentId] = useState('');
    const [creating, setCreating] = useState(false);

    // ── Edit form ─────────────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editVersion, setEditVersion] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editStatus, setEditStatus] = useState<string>('PENDING');
    const [editServiceEnvironmentId, setEditServiceEnvironmentId] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Search / filter ───────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // ── Expanded detail card ──────────────────────────────────────────────────
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // ── Pagination ───────────────────────────────────────────────────────────
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    // ── Dialogs ───────────────────────────────────────────────────────────────
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmRedeployId, setConfirmRedeployId] = useState<string | null>(null);

    // ── Load all data ─────────────────────────────────────────────────────────
    const load = async () => {
        setLoading(true);
        try {
            const [deps, allDeps, rels, svcs, envs] = await Promise.all([
                listDeploymentsPaginated(page, PAGE_SIZE),
                listDeployments(),
                listServiceEnvironments(),
                listServices(),
                listEnvironments()
            ]);
            setDeployments(deps.items);
            setAllDeployments(allDeps);
            setTotalElements(deps.total);
            setServiceEnvironments(rels);
            setServices(svcs);
            setEnvironments(envs);

            if (!serviceEnvironmentId && rels[0]?.id) {
                setServiceEnvironmentId(rels[0].id);
            }
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return deployments.filter((d) => {
            const matchesSearch =
                !q ||
                [d.version, d.status, d.notes ?? '', d.id, d.serviceEnvironmentId].join(' ').toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [deployments, search, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!version.trim()) return toast.error('Version is required');
        if (!serviceEnvironmentId.trim()) return toast.error('Service environment is required');

        setCreating(true);
        try {
            await createDeployment({
                version: version.trim(),
                notes: notes.trim() || undefined,
                status,
                serviceEnvironmentId
            });
            toast.success('Deployment created');
            setVersion('1.0.0');
            setNotes('');
            setStatus('PENDING');
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create deployment'));
        } finally {
            setCreating(false);
        }
    };

    // ── Edit helpers ──────────────────────────────────────────────────────────
    const startEdit = (d: DeploymentResponse) => {
        setEditingId(d.id);
        setEditVersion(d.version);
        setEditNotes(d.notes || '');
        setEditStatus(d.status);
        setEditServiceEnvironmentId(d.serviceEnvironmentId);
        setExpandedId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditVersion('');
        setEditNotes('');
        setEditStatus('PENDING');
        setEditServiceEnvironmentId('');
    };

    // ── Update ────────────────────────────────────────────────────────────────
    const handleUpdate = async (id: string) => {
        if (!editVersion.trim()) return toast.error('Version is required');
        if (!editServiceEnvironmentId.trim()) return toast.error('Service environment is required');

        setSaving(true);
        try {
            await updateDeployment(id, {
                version: editVersion.trim(),
                notes: editNotes.trim() || undefined,
                status: editStatus,
                serviceEnvironmentId: editServiceEnvironmentId
            });
            toast.success('Deployment updated');
            cancelEdit();
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to update deployment'));
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            await deleteDeployment(id);
            toast.success('Deployment deleted');
            if (expandedId === id) setExpandedId(null);
            setConfirmDeleteId(null);
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete deployment'));
        }
    };

    // ── Redeploy ──────────────────────────────────────────────────────────────
    const handleRedeploy = async (id: string) => {
        try {
            await redeployDeployment(id);
            toast.success('Deployment redeployed');
            setConfirmRedeployId(null);
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to redeploy'));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 3 }} />

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                {t('deployments.helperText')}
            </Alert>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #F472B6, #EC4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)'
                    }}
                >
                    <RocketLaunchIcon sx={{ color: '#fff', fontSize: 26 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        Deployments
                    </Typography>
                    <Typography sx={{ color: C.muted }}>
                        Deployment history and new deployment creation.
                    </Typography>
                </Box>
            </Box>

            {/* ── Create form ──────────────────────────────────────────────── */}
            <CreateDeploymentForm
                version={version}
                onVersionChange={setVersion}
                notes={notes}
                onNotesChange={setNotes}
                status={status}
                onStatusChange={setStatus}
                serviceEnvironmentId={serviceEnvironmentId}
                onServiceEnvironmentChange={setServiceEnvironmentId}
                serviceEnvironments={serviceEnvironments}
                services={services}
                environments={environments}
                creating={creating}
                onCreate={handleCreate}
            />

            {/* ── Search & filter ──────────────────────────────────────────── */}
            <DeploymentFilters
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                resultCount={filtered.length}
            />

            {/* ── Stats summary ────────────────────────────────────────────── */}
            {!loading && deployments.length > 0 && (
                <DeploymentStats
                    deployments={deployments}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                />
            )}

            {/* ── Deployment cards ─────────────────────────────────────────── */}
            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filtered.length === 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: 3, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <RocketLaunchIcon sx={{ fontSize: 32, color: C.brand }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                            {search || statusFilter !== 'ALL'
                                ? 'No deployments match your search.'
                                : 'No deployments yet. Create one above.'}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                    {filtered.map((d) => (
                        <DeploymentCard
                            key={d.id}
                            deployment={d}
                            serviceEnvironments={serviceEnvironments}
                            services={services}
                            environments={environments}
                            isEditing={editingId === d.id}
                            editingVersion={editVersion}
                            editingNotes={editNotes}
                            editingStatus={editStatus}
                            editingServiceEnvironmentId={editServiceEnvironmentId}
                            onVersionChange={setEditVersion}
                            onNotesChange={setEditNotes}
                            onStatusChange={setEditStatus}
                            onServiceEnvironmentChange={setEditServiceEnvironmentId}
                            onStartEdit={() => startEdit(d)}
                            onCancelEdit={cancelEdit}
                            onSave={() => handleUpdate(d.id)}
                            saving={saving}
                            onRedeploy={(id) => setConfirmRedeployId(id)}
                            onDelete={(id) => setConfirmDeleteId(id)}
                        />
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            {/* ── Delete dialog ────────────────────────────────────────────── */}
            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle>Delete deployment</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete this deployment? This action cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                    <Button onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* ── Redeploy dialog ──────────────────────────────────────────── */}
            <Dialog open={!!confirmRedeployId} onClose={() => setConfirmRedeployId(null)}>
                <DialogTitle>Redeploy deployment</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to redeploy this deployment?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmRedeployId(null)}>Cancel</Button>
                    <Button onClick={() => confirmRedeployId && handleRedeploy(confirmRedeployId)} sx={{ color: '#fff', background: '#0EA5E9', '&:hover': { background: '#0284C7' } }}>Redeploy</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DeploymentsPage;
