import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

const vericalCenterStyle = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: '100%',
};

const Header = ({ isMenuClosed, setMenuClosing }) => {
  return (
    <Box
      sx={{
        ...vericalCenterStyle,
        height: '70px',
        borderBottom: '1px solid #F6DDE7',
        color: '#64748B',
        px: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#E4477D',
            boxShadow: '0 0 0 4px #FDEAF2',
            display: isMenuClosed ? 'none' : 'block',
            transition: 'all 0.5s ease',
          }}
        />
        <NavLink to="/profile" style={{ textDecoration: 'none' }}>
          <Typography
            sx={{
              width: isMenuClosed ? '0' : '120px',
              overflow: 'hidden',
              transition: 'width 0.5s',
              color: '#e4477d',
              fontWeight: 'bold',
            }}
          >
            Auth Console
          </Typography>
        </NavLink>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography
          onClick={setMenuClosing}
          sx={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '8px',
            color: '#BE185D',
            backgroundColor: '#FCE7F3',
            border: '1px solid #F8CADD',
            fontWeight: 'bold',
            fontSize: '18px',
            transition: 'all 0.25s ease, transform 0.25s ease',
            transform: isMenuClosed ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: isMenuClosed ? '-100%' : '0',
            '&:hover': {
              backgroundColor: '#F9D7E7',
              color: '#9D174D',
            },
          }}
        >
          ‹
        </Typography>
      </Box>
    </Box>
  );
};

Header.propTypes = {
  isMenuClosed: PropTypes.bool,
  setMenuClosing: PropTypes.func,
};

export default Header;
