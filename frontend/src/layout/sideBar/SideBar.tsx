import { Box, useMediaQuery } from '@mui/material';
import { useEffect, useState } from 'react';
import Body from './components/Body';
import Footer from './components/Footer';
import Header from './components/Header';
import { C} from '../../theme/tokens';

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 60;

interface SideBarProps {
    setSideBarWidth: (width: number) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

const SideBar = ({ setSideBarWidth, mobileOpen, onMobileClose }: SideBarProps) => {
    const [isClosed, setIsClosed] = useState(false);
    const isTablet = useMediaQuery('(min-width:768px) and (max-width:1023px)');
    const isMobile = useMediaQuery('(max-width:767px)');

    useEffect(() => {
        if (isTablet) setIsClosed(true);
    }, [isTablet]);

    useEffect(() => {
        setSideBarWidth(isMobile ? 0 : (isClosed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED));
    }, [isClosed, isMobile, setSideBarWidth]);

    const switchMenuClosing = () => setIsClosed((prev) => !prev);

    const width = isMobile ? SIDEBAR_EXPANDED : (isClosed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

    return (
        <>
            {isMobile && mobileOpen && (
                <Box
                    onClick={onMobileClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 4,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        transition: 'opacity 0.3s ease',
                    }}
                />
            )}
            <Box
                sx={{
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8FB 100%)',
                    height: '100vh',
                    width: `${width}px`,
                    transition: 'width 0.5s, transform 0.3s ease',
                    position: 'fixed',
                    zIndex: isMobile && mobileOpen ? 5 : 3,
                    left: 0,
                    top: 0,
                    borderRight: `1px solid ${C.border}`,
                    boxShadow: isMobile && mobileOpen
                        ? '0 0 30px rgba(0,0,0,0.15)'
                        : '6px 0 18px rgba(228, 71, 125, 0.06)',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
                    '&::-webkit-scrollbar': {
                        width: '3px'
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#F5D8E4',
                        borderRadius: '3px'
                    }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '100%'
                    }}
                >
                    <Box>
                        <Header isMenuClosed={isClosed} setMenuClosing={switchMenuClosing} />
                        <Body isMenuClosed={isClosed} />
                    </Box>
                    <Footer isMenuClosed={isClosed} />
                </Box>
            </Box>
        </>
    );
};

export default SideBar;
