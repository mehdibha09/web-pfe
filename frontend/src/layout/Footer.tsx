import { Box, Typography } from '@mui/material';

const Footer = () => {
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
      <Typography variant="body2" sx={{ color: '#64748B' }}>
        © 2026 Auth Console. All rights reserved.
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748B' }}>
        Backend integration later
      </Typography>
    </Box>
  );
};

export default Footer;
