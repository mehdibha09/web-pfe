import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { Alert, Box } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { ServiceResponse } from '../../../services/devopsService';
import { listServicesPaginated } from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/core/authStorage';
import { canAccessAuditLogs, canManageDeployments } from '../../../services/core/authorization';
import { pageBg } from './constants';
import CreateServiceCard from './CreateServiceCard';
import HeaderCard from './HeaderCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import PaginationBar from '../../../components/PaginationBar';
import SearchCard from './SearchCard';
import ServiceCard from './ServiceCard';

const ServicesPage = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);
    const allowManage = canManageDeployments(getStoredUser()!);
    const canViewAudit = canAccessAuditLogs(getStoredUser()!);

    const load = async () => {
        setLoading(true);
        try {
            const paginated = await listServicesPaginated(page, PAGE_SIZE);
            setServices(paginated.items);
            setTotalElements(paginated.total);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to load services'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    useEffect(() => { if (page >= pageCount && page > 0) setPage(pageCount - 1); }, [totalElements]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) => [s.name, s.type, s.status, s.runtime, s.tenantId].join(' ').toLowerCase().includes(q));
    }, [search, services]);

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    return (
        <Box sx={pageBg}>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 2 }} />
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#F0F4FF', '& .MuiAlert-icon': { color: '#3B82F6' } }}>
                {t('services.helperText')}
            </Alert>
            <HeaderCard services={services} />
            {allowManage && <CreateServiceCard onCreated={load} />}
            <SearchCard search={search} onSearchChange={setSearch} resultCount={filtered.length} />

            {loading ? (
                <LoadingSpinner variant="block" />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<CloudQueueIcon />}
                    title={t('services.noServices')}
                    message={t('services.tryAdjustingFilter')}
                />
            ) : (
                <>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
                        gap: 2
                    }}
                >
                    {filtered.map((s) => (
                        <ServiceCard key={s.id} service={s} onRefresh={load} allowManage={allowManage} canViewAudit={canViewAudit} />
                    ))}
                </Box>
                <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
                </>
            )}
        </Box>
    );
};

export default ServicesPage;
