import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Card, CardContent, Chip, IconButton, InputAdornment, MenuItem, TextField } from '@mui/material';
import { C} from '../theme/tokens';

interface FilterOption {
    label: string;
    value: string;
}

interface SearchFilterBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters?: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        options: FilterOption[];
    }[];
    resultCount?: number;
    totalCount?: number;
}

const SearchFilterBar = ({
    search,
    onSearchChange,
    searchPlaceholder = 'Search…',
    filters = [],
    resultCount,
    totalCount
}: SearchFilterBarProps) => (
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
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    sx={{ minWidth: 220 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: C.subtle }} />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => onSearchChange('')}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }
                    }}
                />
                {filters.map((f) => (
                    <TextField
                        key={f.label}
                        size="small"
                        select
                        label={f.label}
                        value={f.value}
                        onChange={(e) => f.onChange(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        {f.options.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                ))}
                {resultCount !== undefined && totalCount !== undefined && (
                    <Chip
                        label={`${resultCount} / ${totalCount}`}
                        size="small"
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700 }}
                    />
                )}
            </Box>
        </CardContent>
    </Card>
);

export default SearchFilterBar;
