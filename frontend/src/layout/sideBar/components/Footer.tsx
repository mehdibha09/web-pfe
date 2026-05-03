import { useNavigate } from 'react-router-dom';
import { logout } from '../../../services/authService';
import { clearSession, getRefreshToken } from '../../../services/authStorage';
import Module from './Module';

interface FooterProps {
  isMenuClosed: boolean;
}

const Footer = ({ isMenuClosed }: FooterProps) => {
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

export default Footer;
