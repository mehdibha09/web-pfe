import { Box, Paper } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppBar from './AppBar';
import Footer from './Footer';
import SideBar from './sideBar/SideBar';

const ProtectedLayout = () => {
  const [sideBarWidth, setSideBarWidth] = useState(220);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFFDFE 0%, #FFF5F9 100%)',
      }}
    >
      <SideBar setSideBarWidth={setSideBarWidth} />
      <Box
        sx={{
          marginLeft: `${sideBarWidth}px`,
          minHeight: '100vh',
          transition: 'margin-left 0.5s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar />
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            m: 3,
            borderRadius: 4,
            border: '1px solid #F5D8E4',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            boxShadow: '0 10px 24px rgba(228, 71, 125, 0.08)',
          }}
        >
          <Box
            sx={{
              minHeight: 'calc(100vh - 72px - 72px - 48px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
            <Footer />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ProtectedLayout;
