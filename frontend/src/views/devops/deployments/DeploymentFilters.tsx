import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Card, CardContent, Chip, IconButton, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { STATUSES } from './constants';
import { C} from '../../../theme/tokens';

type Props = {
    search: string;
    onSearchChange: (v: string) => void;
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
    resultCount: number;
};

const DeploymentFilters = ({ search, onSearchChange, statusFilter, onStatusFilterChange, resultCount }: Props) => {
    const { t } = useTranslation();
    return (
    <Card sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ height: 3, background: 'linear-gradient(135deg, #06B6D4, #2E5C8A)' }} />
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #06B6D4, #2E5C8A)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <FilterListIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {t('deployments.searchAndFilter')}
                </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 200px 150px', gap: 2 }}>
                <TextField
                    label={t('common.search')}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('deployments.searchPlaceholder')}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: C.subtle }} />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => onSearchChange('')}>
                                        ✕
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }
                    }}
                />
                <TextField
                    select
                    label={t('deployments.statusFilter')}
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                >
                    <MenuItem value="ALL">{t('deployments.allStatuses')}</MenuItem>
                    {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                            {s}
                        </MenuItem>
                    ))}
                </TextField>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip
                        label={t('deployments.resultCount', { count: resultCount })}
                        sx={{
                            fontWeight: 700,
                            fontSize: 13,
                            background: 'linear-gradient(135deg, #E4E7F4, #C7D2FE)',
                            color: '#3E468A',
                            border: '1px solid #A5B4FC'
                        }}
                    />
                </Box>
            </Box>
        </CardContent>
    </Card>
    );
};

export default DeploymentFilters;
