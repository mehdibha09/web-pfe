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

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../../../services/authStorage';
import {
    canAccessAlerts,
    canAccessAuditLogs,
    canAccessBackups,
    canAccessCosts,
    canAccessDeployments,
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
    canAccessVMs
} from '../../../services/authorization';
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

    const sections: { label: string; modules: ModuleDef[] }[] = [
        {
            label: t('nav.general'),
            modules: [
                { label: t('nav.dashboard'), link: 'admin/dashboard', icon: DashboardIcon, visible: true },
            ]
        },
        {
            label: t('nav.administration'),
            modules: [
                { label: t('nav.users'), link: 'admin/users', icon: PeopleAltIcon, visible: user ? canAccessUsers(user) : false },
                { label: t('nav.roles'), link: 'admin/roles', icon: Person2Icon, visible: user ? canAccessRoles(user) : false },
                { label: t('nav.permissions'), link: 'admin/permissions', icon: LockOutlinedIcon, visible: user ? canAccessPermissions(user) : false },
                { label: t('nav.tenants'), link: 'admin/tenants', icon: DomainAddIcon, visible: user ? canAccessTenants(user) : false },
                { label: t('nav.sessions'), link: 'admin/sessions', icon: DevicesIcon, visible: user ? canAccessSessions(user) : false },
                { label: t('nav.auditLogs'), link: 'admin/audit-logs', icon: ChangeHistoryIcon, visible: user ? canAccessAuditLogs(user) : false },
            ]
        },
        {
            label: t('nav.devops'),
            modules: [
                { label: t('nav.dashboard'), link: 'admin/devops/dashboard', icon: DashboardIcon, visible: true },
                { label: t('nav.services'), link: 'admin/devops/services', icon: DashboardIcon, visible: user ? canAccessServices(user) : false },
                { label: t('nav.environments'), link: 'admin/devops/environments', icon: DomainAddIcon, visible: user ? canAccessEnvironments(user) : false },
                { label: t('nav.serviceEnvs'), link: 'admin/devops/service-environments', icon: DevicesIcon, visible: user ? canAccessServiceEnvironments(user) : false },
                { label: t('nav.deployments'), link: 'admin/devops/deployments', icon: DevicesIcon, visible: user ? canAccessDeployments(user) : false },
                { label: t('nav.metrics'), link: 'admin/devops/metrics', icon: ChangeHistoryIcon, visible: user ? canAccessMetrics(user) : false },
                { label: t('nav.monitoring'), link: 'admin/devops/monitoring', icon: ChangeHistoryIcon, visible: user ? canAccessMetrics(user) : false },
            ]
        },
        {
            label: t('nav.infrastructure'),
            modules: [
                { label: t('nav.vms'), link: 'admin/devops/vms', icon: DevicesIcon, visible: user ? canAccessVMs(user) : false },
                { label: t('nav.kubernetes'), link: 'admin/devops/k8s', icon: AccountTreeIcon, visible: user ? canAccessK8s(user) : false },
                { label: t('nav.backups'), link: 'admin/devops/backups', icon: DevicesIcon, visible: user ? canAccessBackups(user) : false },
            ]
        },
        {
            label: t('nav.finance'),
            modules: [
                { label: t('nav.rateCard'), link: 'admin/pricing', icon: PriceChangeIcon, visible: user ? canAccessPricing(user) : false },
                { label: t('nav.costs'), link: 'admin/devops/costs', icon: AttachMoneyIcon, visible: user ? canAccessCosts(user) : false },
                { label: t('nav.quotas'), link: 'admin/devops/quotas', icon: GavelIcon, visible: user ? canAccessQuotas(user) : false },
            ]
        },
        {
            label: t('nav.system'),
            modules: [
                { label: t('nav.alerts'), link: 'admin/devops/alerts', icon: NotificationsActiveIcon, visible: user ? canAccessAlerts(user) : false },
                { label: t('nav.notifications'), link: 'admin/devops/notifications', icon: NotificationsActiveIcon, visible: user ? canAccessNotifications(user) : false },
            ]
        }
    ];

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

    const profileModule = (
        <Module
            key="profile"
            label={t('nav.profile')}
            link="profile"
            selectedIndex={currentLink}
            isMenuClosed={isMenuClosed}
            icon={AccountCircleIcon}
        />
    );

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
