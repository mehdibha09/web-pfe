import { Avatar, Box, Chip, Toolbar, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredUser } from '../services/authStorage';

const titleMap: Record<string, string> = {
  '/profile': 'Profile',
  '/change-password': 'Change Password',
  '/two-fa': 'Two-Factor Authentication',
  '/admin/users': 'Users Management',
  '/admin/roles': 'Roles Management',
  '/admin/permissions': 'Permissions Management',
  '/admin/tenants': 'Tenants Management',
  '/admin/sessions': 'Sessions Management',
  '/admin/audit-logs': 'Audit Logs',
};

const AppBar = () => {
  const location = useLocation();
  const user = getStoredUser();

  const pageTitle = useMemo(() => titleMap[location.pathname] || 'Dashboard', [location.pathname]);

  const initials = useMemo(() => {
    const source = user?.email || 'User';
    return source
      .split('@')[0]
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user?.email]);

  return (
    <Toolbar
      sx={{
        height: 72,
        minHeight: 72,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 3,
        borderBottom: '1px solid #F6DDE7',
        background: 'linear-gradient(90deg, #ffffff 0%, #FFF3F8 100%)',
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
          {pageTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Manage authentication and administration in one place
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label={user?.roles?.[0] || 'ADMIN'}
          size="small"
          sx={{
            backgroundColor: '#FCE7F3',
            color: '#E4477D',
            border: '1px solid #F8CADD',
            fontWeight: 700,
          }}
        />
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
            {user?.email || 'local.user@example.com'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {user?.tenantName || 'Local Tenant'}
          </Typography>
        </Box>
        <Avatar sx={{ width: 40, height: 40, backgroundColor: '#E4477D' }}>
          {initials || 'U'}
        </Avatar>
      </Box>
    </Toolbar>
  );
};

export default AppBar;
