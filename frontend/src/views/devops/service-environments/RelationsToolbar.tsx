import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { Box, Chip, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { P } from './palette';

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        '& fieldset': { borderColor: P.border },
        '&:hover fieldset': { borderColor: P.subtle },
        '&.Mui-focused fieldset': { borderColor: P.brand }
    },
    '& label.Mui-focused': { color: P.brand }
};

type RelationsToolbarProps = {
    filteredCount: number;
    search: string;
    onSearchChange: (value: string) => void;
    loading: boolean;
    onRefresh: () => void;
};

const RelationsToolbar = ({ filteredCount, search, onSearchChange, loading, onRefresh }: RelationsToolbarProps) => {
    const { t } = useTranslation();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ fontSize: 18, color: P.brand }} />
                <Typography sx={{ fontWeight: 700, color: P.text }}>{t('serviceEnvs.relations')}</Typography>
                <Chip
                    label={t('serviceEnvs.linked', { count: filteredCount })}
                    size="small"
                    sx={{
                        backgroundColor: P.brandLight,
                        color: P.brandDark,
                        fontWeight: 800,
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        border: `1px solid ${P.brand}22`
                    }}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    placeholder={t('serviceEnvs.searchPlaceholder')}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    sx={{ ...inputSx, width: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 16, color: P.subtle }} />
                                </InputAdornment>
                            )
                        }
                    }}
                />
                <Tooltip title={t('common.refresh')}>
                    <span>
                        <IconButton
                            onClick={onRefresh}
                            disabled={loading}
                            sx={{
                                border: `1px solid ${P.border}`,
                                borderRadius: 2,
                                backgroundColor: P.surface,
                                color: loading ? P.subtle : P.muted,
                                '&:hover': { backgroundColor: P.brandLight, color: P.brand }
                            }}
                        >
                            <RefreshIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default RelationsToolbar;
