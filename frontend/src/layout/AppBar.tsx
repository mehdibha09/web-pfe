import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Popover,
    Toolbar,
    Typography,
    useMediaQuery
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getStoredUser } from '../services/authStorage';
import { C } from '../theme/tokens';
import {
    countUnreadNotifications,
    listNotifications,
    markAsRead,
    type NotificationResponse
} from '../services/notificationService';

const API_BASE_URL = (() => {
    const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, '');
    const host = import.meta.env.VITE_API_HOST || 'localhost';
    const port = import.meta.env.VITE_API_PORT || '6060';
    const apiPath = (import.meta.env.VITE_API_PATH || '/api/v1').replace(/^\/+/, '/');
    return `http://${host}:${port}${apiPath}`.replace(/\/$/, '');
})();

const titleKeys: Record<string, string> = {
  '/profile': 'appBar.profile',
  '/change-password': 'appBar.changePassword',
  '/two-fa': 'appBar.twoFactorAuth',
  '/admin/users': 'appBar.usersManagement',
  '/admin/roles': 'appBar.rolesManagement',
  '/admin/permissions': 'appBar.permissionsManagement',
  '/admin/tenants': 'appBar.tenantsManagement',
  '/admin/sessions': 'appBar.sessionsManagement',
  '/admin/audit-logs': 'appBar.auditLogs',
};

const typeColorMap: Record<string, string> = {
    DEPLOYMENT: '#2E5C8A',
    ALERT: '#C95B6E',
    SYSTEM: '#2E7A4F',
    QUOTA: '#8A6A2E',
    BACKUP: '#5E4B9E',
    VM: '#2E7A4F',
    K8S: '#5E4B9E'
};

interface AppBarProps {
    onMenuClick?: () => void;
}

const AppBar = ({ onMenuClick }: AppBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(getStoredUser());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
      const syncUser = () => setUser(getStoredUser());
      window.addEventListener('authUserUpdated', syncUser);
      window.addEventListener('storage', syncUser);
      return () => {
          window.removeEventListener('authUserUpdated', syncUser);
          window.removeEventListener('storage', syncUser);
      };
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationResponse[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isMobile = useMediaQuery('(max-width:767px)');
  const pageTitle = useMemo(() => t(titleKeys[location.pathname] || 'appBar.dashboard'), [location.pathname, t]);

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

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await countUnreadNotifications(user.userId);
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [user]);

  const fetchRecent = useCallback(async () => {
    if (!user) return;
    try {
      const all = await listNotifications(user.userId);
      setRecentNotifications(all.slice(0, 8));
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        await fetchEventSource(`${API_BASE_URL}/notifications/stream`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: ctrl.signal,
          onmessage: (event) => {
            if (event.event !== 'notification') return;
            try {
              const data = JSON.parse(event.data);
              setUnreadCount((prev) => prev + 1);
              setRecentNotifications((prev) => {
                const newNotif: NotificationResponse = {
                  id: data.id,
                  userId: user.userId,
                  title: data.title,
                  message: data.message,
                  type: data.type,
                  read: false,
                  tenantId: user.tenantId,
                  link: data.link || null,
                  createdAt: data.timestamp,
                  updatedAt: data.timestamp
                };
                return [newNotif, ...prev].slice(0, 8);
              });
            } catch {
              // ignore parse errors
            }
          },
          onerror: () => {
            ctrl.abort();
          }
        });
      } catch {
        // connection closed or aborted
      }
    })();

    return () => {
      ctrl.abort();
      esRef.current = null;
    };
  }, [user]);

  const handleBellClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchRecent();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setRecentNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleNotificationClick = (n: NotificationResponse) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.link) navigate(n.link);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <Toolbar
      sx={{
        height: 72,
        minHeight: 72,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 3,
        borderBottom: `1px solid ${C.border}`,
        background: 'linear-gradient(90deg, #ffffff 0%, #FFF3F8 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {isMobile && (
          <IconButton onClick={onMenuClick} sx={{ color: C.brand }}>
            <MenuIcon />
          </IconButton>
        )}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
            {pageTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: C.muted }}>
            {t('appBar.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label={user?.roles?.[0] || 'ADMIN'}
          size="small"
          sx={{
            backgroundColor: C.brandLight,
            color: C.brand,
            border: '1px solid #F8CADD',
            fontWeight: 700,
          }}
        />

        {/* Language switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
            <IconButton
                size="small"
                onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
                sx={{
                    width: 32, height: 32,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: C.border,
                    backgroundColor: C.surface,
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text
                }}
            >
                {i18n.language === 'fr' ? t('appBar.langEn') : t('appBar.langFr')}
            </IconButton>
        </Box>

        {/* Bell icon */}
        <IconButton onClick={handleBellClick} sx={{ color: C.brand }}>
            <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{ '& .MuiBadge-badge': { backgroundColor: '#C95B6E', fontWeight: 700 } }}
            >
                <NotificationsActiveIcon />
            </Badge>
        </IconButton>

        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
                paper: {
                    sx: {
                        width: 380,
                        maxHeight: 480,
                        borderRadius: 3,
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 10px 40px rgba(228,71,125,0.15)',
                        mt: 1
                    }
                }
            }}
        >
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: C.text }}>
                    {t('notifications.title')}
                </Typography>
                <Button
                    size="small"
                    onClick={() => {
                        handleClose();
                        navigate('/admin/devops/notifications');
                    }}
                    sx={{ textTransform: 'none', color: C.brand, fontWeight: 700, fontSize: 12 }}
                >
                    {t('notifications.viewAll')}
                </Button>
            </Box>
            <Divider sx={{ borderColor: C.border }} />
            {recentNotifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <NotificationsActiveIcon sx={{ color: '#CBD5E1', fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: C.subtle }}>
                        {t('notifications.noNotifications')}
                    </Typography>
                </Box>
            ) : (
                recentNotifications.map((n) => (
                    <Box
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            cursor: 'pointer',
                            backgroundColor: n.read ? '#FFFFFF' : '#FFF8FA',
                            '&:hover': { backgroundColor: '#F8F5FA' },
                            borderBottom: '1px solid #F8F0F4',
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'flex-start'
                        }}
                    >
                        <Box sx={{ mt: 0.5 }}>
                            {n.read ? (
                                <CheckCircleIcon sx={{ fontSize: 18, color: '#2E7A4F' }} />
                            ) : (
                                <WarningAmberIcon sx={{ fontSize: 18, color: C.brand }} />
                            )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: n.read ? 400 : 700, color: C.text, fontSize: 13 }}
                                >
                                    {n.title}
                                </Typography>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: typeColorMap[n.type] || `${C.subtle}`,
                                        flexShrink: 0,
                                        ml: 1
                                    }}
                                />
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: C.muted,
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: 11
                                }}
                            >
                                {n.message}
                            </Typography>
                            <Typography variant="caption" sx={{ color: C.subtle, fontSize: 10 }}>
                                {new Date(n.createdAt).toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>
                ))
            )}
        </Popover>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: C.text }}>
            {user?.email}
          </Typography>
          <Typography variant="caption" sx={{ color: C.muted }}>
            {user?.tenantName}
          </Typography>
        </Box>
        <Avatar sx={{ width: 40, height: 40, backgroundColor: C.brand }}>
          {initials || 'U'}
        </Avatar>
      </Box>
    </Toolbar>
  );
};

export default AppBar;
