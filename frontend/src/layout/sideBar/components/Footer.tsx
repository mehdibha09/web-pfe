import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout } from '../../../services/authService';
import { clearSession } from '../../../services/authStorage';
import Module from './Module';

interface FooterProps {
  isMenuClosed: boolean;
}

const Footer = ({ isMenuClosed }: FooterProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Module
      link={'login'}
      label={t('auth.logout')}
      selectedIndex={' '}
      isMenuClosed={isMenuClosed}
      onClick={() => {
        logout()
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
