import LinkIcon from '@mui/icons-material/Link';
import {
    Alert, Box, Card, CardContent, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { EnvironmentResponse, ServiceEnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import {
    createServiceEnvironment,
    deleteServiceEnvironment,
    listEnvironments,
    listServiceEnvironments,
    listServiceEnvironmentsPaginated,
    listServices,
    updateServiceEnvironment
} from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import Button from '../../../components/MyCustomButton';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';

import CreateForm from './CreateForm';
import RelationCard from './RelationCard';
import RelationsToolbar from './RelationsToolbar';
import StatsBar from './StatsBar';
import { P, type Option } from './palette';

const cardSx = { borderRadius: 3, border: `1px solid ${P.border}`, backgroundColor: P.surface, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

const ServiceEnvironmentsPage = () => {
    const { t } = useTranslation();
    const tenantId = getStoredUser()?.tenantId || '';
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [relations, setRelations] = useState<ServiceEnvironmentResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [serviceId, setServiceId] = useState('');
    const [environmentId, setEnvironmentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
    const [editServiceId, setEditServiceId] = useState('');
    const [editEnvironmentId, setEditEnvironmentId] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const serviceOptions: Option[] = useMemo(() => services.map((s) => ({ id: s.id, label: s.name })), [services]);
    const envOptions: Option[] = useMemo(() => environments.map((e) => ({ id: e.id, label: e.name })), [environments]);
    const envById = useMemo(() => Object.fromEntries(environments.map((e) => [e.id, e])), [environments]);
    const serviceById = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

    const filteredRelations = useMemo(() => {
        if (!search.trim()) return relations;
        const q = search.toLowerCase();
        return relations.filter((r) => {
            const sName = serviceById[r.serviceId]?.name?.toLowerCase() ?? '';
            const eName = envById[r.environmentId]?.name?.toLowerCase() ?? '';
            return sName.includes(q) || eName.includes(q) || r.id.toLowerCase().includes(q);
        });
    }, [relations, search, serviceById, envById]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const load = async () => {
        setLoading(true);
        try {
            const [svc, envs, rels] = await Promise.all([
                listServices(),
                listEnvironments(),
                listServiceEnvironmentsPaginated(page, PAGE_SIZE)
            ]);
            setServices(svc);
            setEnvironments(envs);
            setRelations(rels.items);
            setTotalElements(rels.total);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load relations'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const handleCreate = async () => {
        if (!tenantId.trim()) return toast.error('tenantId is required');
        if (!serviceId) return toast.error('Select a service');
        if (!environmentId) return toast.error('Select an environment');
        try {
            await createServiceEnvironment({ serviceId, environmentId, tenantId });
            toast.success('Service linked to environment');
            setServiceId('');
            setEnvironmentId('');
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to create relation'));
        }
    };

    const startEdit = (r: ServiceEnvironmentResponse) => {
        setEditingRelationId(r.id);
        setEditServiceId(r.serviceId);
        setEditEnvironmentId(r.environmentId);
    };

    const cancelEdit = () => {
        setEditingRelationId(null);
        setEditServiceId('');
        setEditEnvironmentId('');
    };

    const handleUpdate = async () => {
        if (!editingRelationId) return;
        try {
            await updateServiceEnvironment(editingRelationId, {
                serviceId: editServiceId,
                environmentId: editEnvironmentId,
                tenantId
            });
            toast.success('Relation updated');
            cancelEdit();
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to update relation'));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteServiceEnvironment(id);
            toast.success('Relation deleted');
            setConfirmDeleteId(null);
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete relation'));
        }
    };

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            background: P.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <LinkIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: P.text }}>
                            {t('serviceEnvs.title')}
                        </Typography>
                        <Typography sx={{ color: P.muted, fontSize: 14 }}>
                            {t('serviceEnvs.subtitle')}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                {t('serviceEnvs.helperText')}
            </Alert>

            <StatsBar
                relationsCount={totalElements}
                servicesCount={services.length}
                environmentsCount={environments.length}
            />

            <CreateForm
                serviceId={serviceId}
                onServiceIdChange={setServiceId}
                environmentId={environmentId}
                onEnvironmentIdChange={setEnvironmentId}
                serviceOptions={serviceOptions}
                envOptions={envOptions}
                loading={loading}
                onCreate={handleCreate}
            />

            <RelationsToolbar
                filteredCount={filteredRelations.length}
                search={search}
                onSearchChange={setSearch}
                loading={loading}
                onRefresh={load}
            />

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filteredRelations.length === 0 ? (
                <Card sx={{ ...cardSx, textAlign: 'center' }}>
                    <CardContent sx={{ py: 6 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2.5,
                                background: P.gradientMuted,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 1.5
                            }}
                        >
                            <LinkIcon sx={{ fontSize: 28, color: P.brand }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: P.text, mb: 0.5 }}>
                            {search ? t('serviceEnvs.noMatching') : t('serviceEnvs.noRelations')}
                        </Typography>
                        <Typography sx={{ color: P.muted, fontSize: 14 }}>
                            {search
                                ? t('serviceEnvs.adjustSearch')
                                : t('serviceEnvs.linkToStart')}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                    {filteredRelations.map((r) => {
                        const isEditing = editingRelationId === r.id;
                        const svc = serviceById[r.serviceId];
                        const env = envById[r.environmentId];

                        return (
                            <RelationCard
                                key={r.id}
                                relation={r}
                                isEditing={isEditing}
                                serviceName={svc?.name}
                                environmentName={env?.name}
                                serviceOptions={serviceOptions}
                                envOptions={envOptions}
                                editServiceId={editServiceId}
                                onEditServiceIdChange={setEditServiceId}
                                editEnvironmentId={editEnvironmentId}
                                onEditEnvironmentIdChange={setEditEnvironmentId}
                                onStartEdit={() => startEdit(r)}
                                onCancelEdit={cancelEdit}
                                onSave={handleUpdate}
                                onDelete={() => setConfirmDeleteId(r.id)}
                            />
                        );
                    })}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}

            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle>{t('serviceEnvs.confirmDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('serviceEnvs.confirmDeleteBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                    <Button onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} sx={{ color: '#fff', background: '#DC2626', '&:hover': { background: '#B91C1C' } }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ServiceEnvironmentsPage;
