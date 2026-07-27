import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { cardSx } from './constants';
import { C} from '../../../theme/tokens';

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
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        label={t('common.search')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={t('services.searchPlaceholder')}
                    />
                    <TextField label={t('services.results')} value={String(resultCount)} disabled />
                </Box>
            </CardContent>
        </Card>
    );
};

export default SearchCard;
