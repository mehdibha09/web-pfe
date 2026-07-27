import { Box, Typography } from '@mui/material';
import { C} from '../theme/tokens';

interface MetaRowProps {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
}

const MetaRow = ({ label, value, mono }: MetaRowProps) => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase' }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: mono ? 'monospace' : 'inherit' }}>
            {value ?? '—'}
        </Typography>
    </Box>
);

export default MetaRow;
