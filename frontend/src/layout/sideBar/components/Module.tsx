import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

const vericalCenterStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: '100%',
  justifyContent: 'space-between',
};

const Module = ({
  label,
  link,
  selectedIndex,
  isMenuClosed,
  onClick = () => {},
  icon: Icon = null,
}) => {
  const isSelected = link === selectedIndex;

  return (
    <Box
      key={isSelected ? 'selected' : 'not-selected'}
      component={NavLink}
      to={`/${link}`}
      onClick={onClick}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        textDecoration: 'none',
        width: isMenuClosed ? '55px' : '100%',
        transition: 'ease 0.5s',
      }}
    >
      <Box
        sx={{
          ...vericalCenterStyle,
          height: '42px',
          width: isMenuClosed ? '40px' : '100%',
          justifyContent: 'space-between',
          transition: 'ease 0.5s',
          alignItems: 'center',
          color: '#64748B',
          backgroundColor: isSelected ? '#FCE7F3' : 'transparent',
          border: isSelected ? '1px solid #F8CADD' : '1px solid transparent',
          margin: '8px 10px',
          borderRadius: '10px',
          ':hover': {
            cursor: 'pointer',
            backgroundColor: '#FDEAF2',
            borderColor: '#F8CADD',
          },
        }}
      >
        <Box
          sx={{
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: isMenuClosed ? 0 : 1,
            width: '-webkit-fill-available',
          }}
        >
          {Icon && (
            <Icon
              sx={{
                fontSize: '19px',
                color: isSelected ? '#e4477d' : '#64748B',
                minWidth: '18px',
                display: 'block',
              }}
            />
          )}
          <Box
            sx={{
              marginLeft: isMenuClosed ? '0' : '10px',
              fontSize: isMenuClosed ? '0' : '13px',
              fontWeight: isSelected ? '700' : '600',
              color: isSelected ? '#e4477d' : '#64748B',
              whiteSpace: 'nowrap',
              transition: 'ease 0.5s',
              opacity: isMenuClosed ? 0 : 1,
              width: isMenuClosed ? 0 : 'auto',
              overflow: 'hidden',
            }}
          >
            {label}
          </Box>
        </Box>

        <Box
          sx={{
            marginRight: '15px',
            fontWeight: '700',
            color: isSelected ? '#e4477d' : '#64748B',
            display: isMenuClosed ? 'none' : 'flex',
            fontSize: '12px',
          }}
        >
          {isSelected ? '•' : ''}
        </Box>
      </Box>
    </Box>
  );
};

Module.propTypes = {
  label: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  selectedIndex: PropTypes.string.isRequired,
  isMenuClosed: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.elementType,
};

export default Module;
