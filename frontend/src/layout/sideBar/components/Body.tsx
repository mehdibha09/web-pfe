import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Person2Icon from '@mui/icons-material/Person2';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../../../services/core/authStorage';
import {
    canAccessAlerts,
    canAccessAuditLogs,
    canAccessBackups,
    canAccessCosts,
    canAccessDashboard,
    canAccessEnvironments,
    canAccessK8s,
    canAccessMetrics,
    canAccessNotifications,
    canAccessPermissions,
    canAccessPricing,
    canAccessQuotas,
    canAccessRoles,
    canAccessServiceEnvironments,
    canAccessServices,
    canAccessSessions,
    canAccessTenants,
    canAccessUsers,
    canAccessVMs,
    isSuperAdmin
} from '../../../services/core/authorization';
import { C } from '../../../theme/tokens';
import Module from './Module';
import SectionHeader from './SectionHeader';

interface BodyProps {
    isMenuClosed: boolean;
}

interface ModuleDef {
    label: string;
    link: string;
    icon: React.ElementType;
    visible: boolean;
}

const Body = ({ isMenuClosed }: BodyProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const currentLink = location.pathname.replace(/^\//, '');
    const [user, setUser] = useState(getStoredUser);
    const userRef = useRef(user);
    if (userRef.current !== user) userRef.current = user;

    useEffect(() => {
        const syncUser = () => setUser(getStoredUser);
        window.addEventListener('authUserUpdated', syncUser);
        window.addEventListener('storage', syncUser);
        return () => {
            window.removeEventListener('authUserUpdated', syncUser);
            window.removeEventListener('storage', syncUser);
        };
    }, []);

    // Stable — only rebuilds when locale or user changes (not on every render)
    const sections = useMemo((): { label: string; modules: ModuleDef[] }[] => {
        const u = userRef.current;
        const nav = (link: string, labelKey: string, Icon: React.ElementType, visible: boolean): ModuleDef => ({
            label: t(labelKey),
            link,
            icon: Icon,
            visible,
        });
        return [
            {
                label: t('nav.general'),
                modules: [nav('admin/dashboard', 'nav.dashboard', DashboardIcon, true)],
            },
            {
                label: t('nav.administration'),
                modules: [
                    nav('admin/users', 'nav.users', PeopleAltIcon, u ? canAccessUsers(u) : false),
                    nav('admin/roles', 'nav.roles', Person2Icon, u ? canAccessRoles(u) : false),
                    nav('admin/permissions', 'nav.permissions', LockOutlinedIcon, u ? canAccessPermissions(u) : false),
                    nav('admin/tenants', 'nav.tenants', DomainAddIcon, u ? canAccessTenants(u) : false),
                    nav('admin/sessions', 'nav.sessions', DevicesIcon, u ? canAccessSessions(u) : false),
                    nav('admin/audit-logs', 'nav.auditLogs', ChangeHistoryIcon, u ? canAccessAuditLogs(u) : false),
                ],
            },
            {
                label: t('nav.devops'),
                modules: [
                    nav('admin/devops/dashboard', 'nav.dashboard', DashboardIcon, u ? (canAccessDashboard(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/services', 'nav.services', DashboardIcon, u ? (canAccessServices(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/environments', 'nav.environments', DomainAddIcon, u ? (canAccessEnvironments(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/service-environments', 'nav.serviceEnvs', DevicesIcon, u ? (canAccessServiceEnvironments(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/metrics', 'nav.metrics', ChangeHistoryIcon, u ? (canAccessMetrics(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/monitoring', 'nav.monitoring', ChangeHistoryIcon, u ? (canAccessMetrics(u) && !isSuperAdmin(u)) : false),
                ],
            },
            {
                label: t('nav.infrastructure'),
                modules: [
                    nav('admin/devops/vms', 'nav.vms', DevicesIcon, u ? (canAccessVMs(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/k8s', 'nav.kubernetes', AccountTreeIcon, u ? (canAccessK8s(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/backups', 'nav.backups', DevicesIcon, u ? (canAccessBackups(u) && !isSuperAdmin(u)) : false),
                ],
            },
            {
                label: t('nav.finance'),
                modules: [
                    nav('admin/pricing', 'nav.rateCard', PriceChangeIcon, u ? canAccessPricing(u) : false),
                    nav('admin/devops/costs', 'nav.costs', AttachMoneyIcon, u ? canAccessCosts(u) : false),
                    nav('admin/devops/quotas', 'nav.quotas', GavelIcon, u ? canAccessQuotas(u) : false),
                ],
            },
            {
                label: t('nav.system'),
                modules: [
                    nav('admin/devops/alerts', 'nav.alerts', NotificationsActiveIcon, u ? (canAccessAlerts(u) && !isSuperAdmin(u)) : false),
                    nav('admin/devops/notifications', 'nav.notifications', NotificationsActiveIcon, u ? (canAccessNotifications(u) && !isSuperAdmin(u)) : false),
                ],
            },
        ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t, user]);

    // Stable — not recreated on each render
    const profileModule = useMemo(() => (
        <Module
            key="profile"
            label={t('nav.profile')}
            link="profile"
            selectedIndex={currentLink}
            isMenuClosed={isMenuClosed}
            icon={AccountCircleIcon}
        />
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [t, currentLink, isMenuClosed]);

    if (!user) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '12px', color: C.muted, mb: 1.5 }}>
                    {t('nav.sessionExpired')}
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/login')}
                    sx={{
                        fontSize: '11px',
                        color: C.brand,
                        borderColor: C.brand,
                        '&:hover': { borderColor: C.brandDark, backgroundColor: C.brandLight }
                    }}
                >
                    {t('nav.reconnect')}
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: 'auto', marginTop: '10px' }}>
            {profileModule}
            {sections.map((section) => {
                const visibleModules = section.modules.filter((m) => m.visible !== false);
                if (visibleModules.length === 0) return null;
                return (
                    <Box key={section.label}>
                        <SectionHeader label={section.label} isMenuClosed={isMenuClosed} />
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
            })}
        </Box>
    );
};

export default Body;
