import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { C} from '../theme/tokens';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        mt: 'auto',
        px: 3,
        py: 1.5,
        borderTop: '1px solid #EEF2F7',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography variant="body2" sx={{ color: C.muted }}>
        {t('layout.footer.copyright')}
      </Typography>
      <Typography variant="body2" sx={{ color: C.muted }}>
        {t('layout.footer.backendInfo')}
      </Typography>
    </Box>
  );
};

export default Footer;
