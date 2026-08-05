import BackupIcon from '@mui/icons-material/Backup';
import StorageIcon from '@mui/icons-material/Storage';
import RestoreAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, Fade, IconButton, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { Backup } from '../../../services/interfaces/backup';
import type { Vm } from '../../../services/interfaces/vm';
import type { ServiceEnvironment } from '../../../services/interfaces/serviceEnvironment';
import type { ServiceResponse, EnvironmentResponse } from '../../../services/interfaces/devops';
import { backupService } from '../../../services/backupService';
import { vmService } from '../../../services/VmService';
import { serviceEnvironmentService } from '../../../services/ServiceEnvironmentService';
import { listServices, listEnvironments } from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { canManageBackups } from '../../../services/authorization';
import { C } from '../../../theme/tokens';

import PageHeader from '../../../components/PageHeader';
import KpiCard from '../../../components/KpiCard';
import SearchFilterBar from '../../../components/SearchFilterBar';
import EmptyState from '../../../components/EmptyState';
import DeleteDialog from '../../../components/DeleteDialog';
import LoadingState from '../../../components/LoadingState';
import CollapsibleFormCard from '../../../components/CollapsibleFormCard';
import PaginationBar from '../../../components/PaginationBar';

import BackupCard from './BackupCard';
import CreateBackupForm from './CreateBackupForm';

const BackupPage = () => {
    const { t } = useTranslation();
    const [backups, setBackups] = useState<Backup[]>([]);
    const [vms, setVms] = useState<Vm[]>([]);
    const [serviceEnvs, setServiceEnvs] = useState<ServiceEnvironment[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const currentUser = getStoredUser();
    const allowManage = currentUser ? canManageBackups(currentUser) : false;

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError(null);
        try {
            const [b, vmList, envList, svcList, envSvcList] = await Promise.all([
                backupService.getAllPaginated(page, PAGE_SIZE),
                vmService.getAll(),
                serviceEnvironmentService.getAll(),
                listServices(),
                listEnvironments()
            ]);
            setBackups(b.items);
            setTotalElements(b.total);
            setVms(vmList);
            setServiceEnvs(envList);
            setServices(svcList);
            setEnvironments(envSvcList);
        } catch (e: unknown) {
            const msg = getErrorMessage(e, t('backups.failedToLoad'));
            setError(msg);
            if (quiet) toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const vmNameById = useMemo(() => {
        const map: Record<string, string> = {};
        vms.forEach((vm) => { map[vm.id] = vm.name; });
        return map;
    }, [vms]);

    const serviceNameById = useMemo(() => {
        const map: Record<string, string> = {};
        services.forEach((svc) => { map[svc.id] = svc.name; });
        return map;
    }, [services]);

    const envNameById = useMemo(() => {
        const map: Record<string, string> = {};
        environments.forEach((env) => { map[env.id] = env.name; });
        return map;
    }, [environments]);

    const seDisplayNameById = useMemo(() => {
        const map: Record<string, string> = {};
        serviceEnvs.forEach((se) => {
            const svcName = serviceNameById[se.serviceId] ?? '—';
            const envName = envNameById[se.environmentId] ?? '—';
            map[se.id] = `${svcName} — ${envName}`;
        });
        return map;
    }, [serviceEnvs, serviceNameById, envNameById]);

    const filtered = useMemo(() => {
        let list = backups;
        if (statusFilter !== 'ALL') {
            list = list.filter((b) => b.status === statusFilter);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((b) =>
                [b.vmId, b.serviceEnvironmentId, b.filePath, b.notes, b.id, b.status,
                 vmNameById[b.vmId] ?? '', seDisplayNameById[b.serviceEnvironmentId] ?? '']
                    .join(' ').toLowerCase().includes(q)
            );
        }
        return list;
    }, [backups, search, statusFilter, vmNameById, seDisplayNameById]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const kpis = useMemo(() => ({
        total: Math.max(backups.length, totalElements),
        completed: backups.filter((b) => b.status === 'COMPLETED').length,
        restored: backups.filter((b) => b.status === 'RESTORED').length,
        failed: backups.filter((b) => b.status === 'FAILED').length
    }), [backups, totalElements]);

    const handleRestore = async (id: string) => {
        try {
            await backupService.restore(id);
            toast.success(t('backups.restoredSuccess'));
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('backups.failedToRestore')));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await backupService.remove(deleteTarget.id);
            toast.success(t('backups.deleted'));
            setDeleteTarget(null);
            await load(true);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('backups.failedToDelete')));
        } finally {
            setDeleting(false);
        }
    };

    const headerAction = (
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
            {allowManage && (
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
                {t('backups.createBackup')}
            </Button>
            )}
        </Box>
    );

    return (
        <div>
            <PageHeader
                title={t('backups.title')}
                subtitle={t('backups.subtitle', { count: Math.max(backups.length, totalElements) })}
                icon={<BackupIcon sx={{ color: '#fff', fontSize: 22 }} />}
                action={headerAction}
            />

            <div style={{ padding: '0 32px' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                    <KpiCard label={t('backups.totalBackups')} value={kpis.total} icon={<StorageIcon sx={{ color: '#E4477D', fontSize: 22 }} />} bg="#FCE7F3" color="#E4477D" />
                    <KpiCard label={t('backups.completed')} value={kpis.completed} icon={<BackupIcon sx={{ color: '#2E5C8A', fontSize: 22 }} />} bg="#E4EEF7" color="#2E5C8A" />
                    <KpiCard label={t('backups.restored')} value={kpis.restored} icon={<RestoreAltIcon sx={{ color: '#8A6A2E', fontSize: 22 }} />} bg="#F7ECD6" color="#8A6A2E" />
                    <KpiCard label={t('backups.failed')} value={kpis.failed} icon={<DeleteIcon sx={{ color: '#065F46', fontSize: 22 }} />} bg="#D1FAE5" color="#065F46" />
                </Box>

                <CollapsibleFormCard title={t('backups.createNewBackup')} open={createOpen} onToggle={() => setCreateOpen(!createOpen)}>
                    <CreateBackupForm
                        vms={vms}
                        serviceEnvs={serviceEnvs}
                        serviceNameById={serviceNameById}
                        envNameById={envNameById}
                        onCreated={() => { setCreateOpen(false); load(true); }}
                        onCancel={() => setCreateOpen(false)}
                    />
                </CollapsibleFormCard>

                <SearchFilterBar
                    search={search}
                    onSearchChange={setSearch}
                searchPlaceholder={t('backups.searchPlaceholder')}
                    filters={[
                        {
                            label: t('backups.status'),
                            value: statusFilter,
                            onChange: setStatusFilter,
                            options: [
                                { label: t('backups.all'), value: 'ALL' },
                                { label: t('backups.completed'), value: 'COMPLETED' },
                                { label: t('backups.restored'), value: 'RESTORED' },
                                { label: t('backups.failed'), value: 'FAILED' }
                            ]
                        }
                    ]}
                    resultCount={filtered.length}
                    totalCount={totalElements}
                />

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <LoadingState />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title={search || statusFilter !== 'ALL' ? t('backups.noResultsFound') : t('backups.noBackupsYet')}
                        message={
                            search || statusFilter !== 'ALL'
                                ? t('backups.adjustSearch')
                                : t('backups.createFirstBackup')
                        }
                        actionLabel={!search && statusFilter === 'ALL' && allowManage ? t('backups.createBackup') : undefined}
                        onAction={!search && statusFilter === 'ALL' && allowManage ? () => setCreateOpen(true) : undefined}
                    />
                ) : (
                    <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                        {filtered.map((backup) => (
                            <BackupCard
                                key={backup.id}
                                backup={backup}
                                vmNameById={vmNameById}
                                seDisplayNameById={seDisplayNameById}
                                allowManage={allowManage}
                                onRestore={handleRestore}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </Box>
                    <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                    </>
                )}
            </div>

            <DeleteDialog open={!!deleteTarget} name={t('backups.backup')} deleting={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        </div>
    );
};

export default BackupPage;
