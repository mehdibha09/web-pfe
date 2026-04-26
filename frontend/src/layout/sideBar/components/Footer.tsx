import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../services/authService';
import { clearSession, getRefreshToken } from '../../../services/authStorage';
import Module from './Module';

const Footer = ({ isMenuClosed }) => {
  const navigate = useNavigate();

  return (
    <Module
      link={'login'}
      label="Logout"
      selectedIndex={' '}
      isMenuClosed={isMenuClosed}
      onClick={() => {
        const refreshToken = getRefreshToken() || undefined;
        logout(refreshToken)
          .catch(() => undefined)
          .finally(() => {
            clearSession();
            navigate('/login');
          });
      }}
    />
  );
};

Footer.propTypes = {
  isMenuClosed: PropTypes.bool,
};

export default Footer;
