import { Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import AppBar from './AppBar';
import Footer from './Footer';
import SideBar from './sideBar/SideBar.tsx';

const ProtectedLayout = () => {
    const { i18n } = useTranslation();
    const [sideBarWidth, setSideBarWidth] = useState(220);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)'
            }}
        >
            <SideBar
                setSideBarWidth={setSideBarWidth}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />
            <Box
                sx={{
                    marginLeft: { xs: '0px', md: `${sideBarWidth}px` },
                    minHeight: '100vh',
                    transition: 'margin-left 0.5s',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <AppBar onMenuClick={() => setMobileSidebarOpen(true)} />
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        m: 3,
                        borderRadius: 4,
                        border: '1px solid #F5D8E4',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                        boxShadow: '0 10px 24px rgba(228, 71, 125, 0.08)'
                    }}
                >
                    <Box
                        sx={{
                            minHeight: 'calc(100vh - 72px - 72px - 48px)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box
                            key={i18n.language}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                animation: 'fadeSlideIn 0.35s ease-out',
                                '@keyframes fadeSlideIn': {
                                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                                    '100%': { opacity: 1, transform: 'translateY(0)' }
                                }
                            }}
                        >
                            <Outlet />
                        </Box>
                        <Footer />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default ProtectedLayout;
