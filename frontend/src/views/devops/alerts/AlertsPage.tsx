import { Grid } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaginationBar from '../../../components/PaginationBar';
import type { AlertResponse } from '../../../services/cloudPricerService';
import { acknowledgeAlert, deleteAlert, listAlertsPaginated, resolveAlert } from '../../../services/cloudPricerService';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../utils/errorMessage';
import { STATUSES } from './constants';
import AlertTable from './AlertTable';
import CreateAlertForm from './CreateAlertForm';
import PageHeader from '../../../components/PageHeader';
import KpiCard from '../../../components/KpiCard';
import SearchFilterBar from '../../../components/SearchFilterBar';
import EmptyState from '../../../components/EmptyState';
import LoadingState from '../../../components/LoadingState';
import CollapsibleFormCard from '../../../components/CollapsibleFormCard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const AlertsPage = () => {
    const { t } = useTranslation();
    const [alerts, setAlerts] = useState<AlertResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const load = async () => {
        setLoading(true);
        try {
            const result = await listAlertsPaginated(page, PAGE_SIZE);
            setAlerts(result.items);
            setTotalElements(result.total);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load alerts'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const [severityFilter, setSeverityFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [kpiFilter, setKpiFilter] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const counts = useMemo(
        () => ({
            total: totalElements,
            open: alerts.filter((a) => a.status === 'OPEN').length,
            ack: alerts.filter((a) => a.status === 'ACK').length,
            resolved: alerts.filter((a) => a.status === 'RESOLVED').length
        }),
        [alerts, totalElements]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return alerts.filter((a) => {
            const matchesSearch = !q || a.message.toLowerCase().includes(q) || a.metric.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
            const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
            const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
            const matchesKpi = kpiFilter === null || kpiFilter === 'TOTAL' || a.status === kpiFilter;
            return matchesSearch && matchesSeverity && matchesStatus && matchesKpi;
        });
    }, [alerts, search, severityFilter, statusFilter, kpiFilter]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    const handleKpiClick = (key: string) => {
        if (kpiFilter === key) {
            setKpiFilter(null);
            setStatusFilter('ALL');
        } else {
            setKpiFilter(key);
            if (key !== 'TOTAL' && key !== null) setStatusFilter(key);
        }
    };

    const handleAcknowledge = async (id: string) => {
        try {
            await acknowledgeAlert(id, 'admin');
            toast.success(t('alerts.acknowledged'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('alerts.failedToAcknowledge')));
        }
    };

    const handleResolve = async (id: string) => {
        try {
            await resolveAlert(id);
            toast.success(t('alerts.resolved'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('alerts.failedToResolve')));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('alerts.confirmDelete'))) return;
        try {
            await deleteAlert(id);
            toast.success(t('alerts.deleted'));
            await load();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('alerts.failedToDelete')));
        }
    };

    const kpiCards = [
        { label: t('alerts.totalAlerts'), value: counts.total, bg: '#FCE7F3', color: '#E4477D', key: 'TOTAL' },
        { label: t('alerts.open'), value: counts.open, bg: '#E4EEF7', color: '#2E5C8A', key: 'OPEN' },
        { label: t('alerts.acknowledged'), value: counts.ack, bg: '#F7ECD6', color: '#8A6A2E', key: 'ACK' },
        { label: t('alerts.resolved'), value: counts.resolved, bg: '#D1FAE5', color: '#065F46', key: 'RESOLVED' }
    ];

    return (
        <div>
            <PageHeader
                title={t('alerts.title')}
                subtitle={t('alerts.subtitle')}
                icon={<NotificationsActiveIcon sx={{ color: '#fff', fontSize: 22 }} />}
            />

            <div style={{ padding: '0 32px' }}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {kpiCards.map((kpi) => (
                        <Grid key={kpi.key} size={{ xs: 12, sm: 6, md: 3 }}>
                            <KpiCard
                                label={kpi.label}
                                value={kpi.value}
                                bg={kpi.bg}
                                color={kpi.color}
                                onClick={() => handleKpiClick(kpi.key)}
                                selected={kpiFilter === kpi.key}
                            />
                        </Grid>
                    ))}
                </Grid>

                <SearchFilterBar
                    search={search}
                    onSearchChange={setSearch}
                searchPlaceholder={t('alerts.searchPlaceholder')}
                    filters={[
                        {
                            label: t('alerts.severity'),
                            value: severityFilter,
                            onChange: setSeverityFilter,
                            options: [
                                { label: t('alerts.allSeverities'), value: 'ALL' },
                                ...(['INFO', 'WARN', 'CRITICAL'] as const).map((s) => ({ label: s, value: s }))
                            ]
                        },
                        {
                            label: t('alerts.status'),
                            value: statusFilter,
                            onChange: setStatusFilter,
                            options: [
                                { label: t('alerts.allStatuses'), value: 'ALL' },
                                ...STATUSES.map((s) => ({ label: s, value: s }))
                            ]
                        }
                    ]}
                    resultCount={filtered.length}
                    totalCount={totalElements}
                />

                <CollapsibleFormCard
                    title={t('alerts.createAlert')}
                    open={showCreate}
                    onToggle={() => setShowCreate(!showCreate)}
                >
                    <CreateAlertForm onCreated={() => { setShowCreate(false); load(); }} />
                </CollapsibleFormCard>

                {loading ? (
                    <LoadingState />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title={search || severityFilter !== 'ALL' || statusFilter !== 'ALL' ? t('alerts.noMatches') : t('alerts.noAlerts')}
                        message={
                            search || severityFilter !== 'ALL' || statusFilter !== 'ALL'
                                ? t('alerts.noMatchesMessage')
                                : t('alerts.noAlertsMessage')
                        }
                    />
                ) : (
                    <>
                        <AlertTable
                            alerts={filtered}
                            onAcknowledge={handleAcknowledge}
                            onResolve={handleResolve}
                            onDelete={handleDelete}
                        />
                        <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                    </>
                )}
            </div>
        </div>
    );
};

export default AlertsPage;
