import { getStoredUser } from '../../services/core/authStorage';
import { getDashboardRole } from '../../services/core/authorization';
import SuperAdminDashboard from './SuperAdminDashboard';
import TenantAdminDashboard from './TenantAdminDashboard';
import StandardUserDashboard from './StandardUserDashboard';

const DashboardPrincipal = () => {
    const user = getStoredUser();
    if (!user) return null;

    const role = getDashboardRole(user);
    if (role === 'super-admin') return <SuperAdminDashboard />;
    if (role === 'tenant-admin') return <TenantAdminDashboard />;
    return <StandardUserDashboard />;
};

export default DashboardPrincipal;
