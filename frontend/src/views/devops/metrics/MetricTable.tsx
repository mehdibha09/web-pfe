import SearchIcon from '@mui/icons-material/Search';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    InputAdornment,
    Pagination,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
    EnvironmentResponse,
    MetricResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import { C, formatBps, formatDateTime, formatPct, serviceEnvironmentLabel } from './constants';

type MetricTableProps = {
    filteredMetrics: MetricResponse[];
    visibleMetrics: MetricResponse[];
    pageCount: number;
    page: number;
    onPageChange: (value: number) => void;
    search: string;
    onSearchChange: (value: string) => void;
    dateFrom: string;
    onDateFromChange: (value: string) => void;
    dateTo: string;
    onDateToChange: (value: string) => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    serviceEnvironments: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
};

const MetricTable = ({
    filteredMetrics,
    visibleMetrics,
    pageCount,
    page,
    onPageChange,
    search,
    onSearchChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    hasActiveFilters,
    onClearFilters,
    serviceEnvironments,
    services,
    environments
}: MetricTableProps) => {
    const { t } = useTranslation();
    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${C.border}`,
                backgroundColor: C.surface,
                boxShadow: '0 2px 8px rgba(228,71,125,0.06)',
                mb: 3
            }}
        >
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap'
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                            {t('metrics.allMetrics')}
                        </Typography>
                        <Typography sx={{ color: C.muted, mt: 0.25 }}>
                            {t('metrics.recordCount', { count: filteredMetrics.length })}
                            {hasActiveFilters ? ` ${t('metrics.matchingFilters')}` : ''}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <TextField
                                size="small"
                                type="date"
                                label={t('metrics.from')}
                                value={dateFrom}
                                onChange={(e) => onDateFromChange(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ minWidth: 150 }}
                            />
                            <TextField
                                size="small"
                                type="date"
                                label={t('metrics.to')}
                                value={dateTo}
                                onChange={(e) => onDateToChange(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ minWidth: 150 }}
                            />
                            <TextField
                                size="small"
                                placeholder={t('metrics.searchPlaceholder')}
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                sx={{ minWidth: { xs: '100%', sm: 260 } }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 18, color: C.subtle }} />
                                            </InputAdornment>
                                        )
                                    }
                                }}
                            />
                            {hasActiveFilters && (
                                <Chip
                                    label={t('metrics.clearFilters')}
                                    size="small"
                                    onClick={onClearFilters}
                                    sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                                />
                            )}
                    </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: C.border }} />

                <TableContainer component={Paper} variant="outlined" sx={{ borderColor: C.border }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{ '& th': { fontWeight: 800, color: C.text, backgroundColor: '#FAFAFA' } }}
                            >
                                <TableCell>{t('metrics.created')}</TableCell>
                                <TableCell>{t('metrics.serviceEnvironment')}</TableCell>
                                <TableCell align="right">{t('metrics.cpu')}</TableCell>
                                <TableCell align="right">{t('metrics.ram')}</TableCell>
                                <TableCell align="right">{t('metrics.network')}</TableCell>
                                <TableCell align="right">{t('metrics.disk')}</TableCell>
                                <TableCell align="right">{t('metrics.pods')}</TableCell>
                                <TableCell>{t('metrics.metricId')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleMetrics.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography sx={{ color: C.muted }}>
                                            {hasActiveFilters
                                                ? t('metrics.noMatchFilters')
                                                : t('metrics.noMetrics')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleMetrics.map((metric) => {
                                    const relation = serviceEnvironments.find(
                                        (item) => item.id === metric.serviceEnvironmentId
                                    );
                                    const relationName = relation
                                        ? serviceEnvironmentLabel(relation, services, environments)
                                        : '— / —';

                                    return (
                                        <TableRow key={metric.id} hover>
                                            <TableCell>{formatDateTime(metric.createdAt)}</TableCell>
                                            <TableCell>{relationName}</TableCell>
                                            <TableCell align="right">{formatPct(metric.cpuUsage)}</TableCell>
                                            <TableCell align="right">{formatPct(metric.ramUsage)}</TableCell>
                                            <TableCell align="right">{formatBps(metric.networkUsage)}</TableCell>
                                            <TableCell align="right">{formatPct(metric.diskUsage)}</TableCell>
                                            <TableCell align="right">{metric.pods}</TableCell>
                                            <TableCell
                                                sx={{ fontFamily: 'monospace', fontSize: 12, color: C.subtle }}
                                            >
                                                {metric.id}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {pageCount > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={pageCount}
                            page={page}
                            onChange={(_, value) => onPageChange(value)}
                            shape="rounded"
                            sx={{
                                '& .Mui-selected': {
                                    backgroundColor: `${C.brand} !important`,
                                    color: '#fff'
                                }
                            }}
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default MetricTable;
