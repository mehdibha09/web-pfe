import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { C } from '../../../theme/tokens';

interface SectionHeaderProps {
  label: string;
  isMenuClosed: boolean;
}

const SectionHeader = ({ label, isMenuClosed }: SectionHeaderProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      mt: 2.5,
      mb: 0.5,
      px: isMenuClosed ? 1.5 : 2,
      gap: 1,
    }}
  >
    <Box
      sx={{
        width: isMenuClosed ? 0 : 20,
        height: '1px',
        backgroundColor: C.border,
        opacity: 0.4,
        transition: 'width 0.3s',
        overflow: 'hidden',
      }}
    />
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: C.brand,
        opacity: 0.7,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontSize: isMenuClosed ? 0 : '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: C.brand,
        opacity: 0.75,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        width: isMenuClosed ? 0 : 'auto',
      }}
    >
      {label}
    </Typography>
  </Box>
);

export default SectionHeader;
