import { Box, CircularProgress } from '@mui/material';

const Loading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh', // Set height to 100% of the viewport height
        width: '100%', // Set width to 100% of the viewport width
      }}
    >
      <CircularProgress sx={{ color: '#e4477d' }} size={100} />
    </Box>
  );
};

export default Loading;
