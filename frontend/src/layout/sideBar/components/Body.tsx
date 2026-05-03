import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import DevicesIcon from '@mui/icons-material/Devices';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Person2Icon from '@mui/icons-material/Person2';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredUser } from '../../../services/authStorage';
import {
  canAccessAuditLogs,
  canAccessPermissions,
  canAccessRoles,
  canAccessSessions,
  canAccessTenants,
  canAccessUsers,
} from '../../../services/authorization';
import Module from './Module';

interface BodyProps {
  isMenuClosed: boolean;
}

const Body = ({ isMenuClosed }: BodyProps) => {
  const location = useLocation();
  const currentLink = location.pathname.replace(/^\//, '');
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());

    window.addEventListener('authUserUpdated', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('authUserUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const modules = [
    { label: 'Profile', link: 'profile', icon: AccountCircleIcon },
    {
      label: 'Users',
      link: 'admin/users',
      icon: PeopleAltIcon,
      visible: user ? canAccessUsers(user) : false,
    },
    {
      label: 'Roles',
      link: 'admin/roles',
      icon: Person2Icon,
      visible: user ? canAccessRoles(user) : false,
    },
    {
      label: 'Permissions',
      link: 'admin/permissions',
      icon: LockOutlinedIcon,
      visible: user ? canAccessPermissions(user) : false,
    },
    {
      label: 'Tenants',
      link: 'admin/tenants',
      icon: DomainAddIcon,
      visible: user ? canAccessTenants(user) : false,
    },
    {
      label: 'Sessions',
      link: 'admin/sessions',
      icon: DevicesIcon,
      visible: user ? canAccessSessions(user) : false,
    },
    {
      label: 'Audit Logs',
      link: 'admin/audit-logs',
      icon: ChangeHistoryIcon,
      visible: user ? canAccessAuditLogs(user) : false,
    },
  ];

  const visibleModules = modules.filter((module) => module.visible !== false);

  return (
    <Box
      sx={{
        height: 'auto',
        marginTop: '10px',
      }}
    >
      {visibleModules.map((item) => (
        <Module
          key={item.link}
          label={item.label}
          link={item.link}
          selectedIndex={currentLink}
          isMenuClosed={isMenuClosed}
          icon={item.icon}
        />
      ))}
    </Box>
  );
};

export default Body;
