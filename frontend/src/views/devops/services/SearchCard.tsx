import { Box, Card, CardContent, Chip, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { cardSx } from './constants';
import { C} from '../../../theme/tokens';
import SearchIcon from '@mui/icons-material/Search';

type SearchCardProps = {
    search: string;
    onSearchChange: (value: string) => void;
    resultCount: number;
};

const SearchCard = ({ search, onSearchChange, resultCount }: SearchCardProps) => {
    const { t } = useTranslation();
    return (
        <Card sx={{ ...cardSx, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: C.text }}>
                    {t('services.search')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <SearchIcon sx={{ color: C.subtle, mr: 1, fontSize: 18 }} />
                                )
                            }
                        }}
                        label={t('common.search')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={t('services.searchPlaceholder')}
                        sx={{ flex: 1 }}
                    />
                    <Chip
                        label={`${resultCount} résultat(s)`}
                        size="small"
                        sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, fontSize: 12, flexShrink: 0 }}
                    />
                </Box>
            </CardContent>
        </Card>
    );
};

export default SearchCard;
