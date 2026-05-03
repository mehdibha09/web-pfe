import { Box } from '@mui/material';
import { useState } from 'react';
import Body from './components/Body';
import Footer from './components/Footer';
import Header from './components/Header';

interface SideBarProps {
  setSideBarWidth: (width: number) => void;
}

const SideBar = ({ setSideBarWidth }: SideBarProps) => {
  const [isClosed, setIsClosed] = useState(false);

  const switchMenuClosing = () => {
    setIsClosed(!isClosed);
    setSideBarWidth(isClosed ? 220 : 60);
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8FB 100%)',
        height: '100%',
        width: isClosed ? '60px' : '220px',
        transition: 'width 0.5s, min-width 0.5s',
        position: 'fixed',
        zIndex: 3,
        left: 0,
        top: 0,
        borderRight: '1px solid #F6DDE7',
        boxShadow: '6px 0 18px rgba(228, 71, 125, 0.06)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        }}
      >
        <Box>
          <Header isMenuClosed={isClosed} setMenuClosing={switchMenuClosing} />
          <Body isMenuClosed={isClosed} />
        </Box>
        <Footer isMenuClosed={isClosed} />
      </Box>
    </Box>
  );
};

export default SideBar;
