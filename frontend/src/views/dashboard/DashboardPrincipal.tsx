import { getStoredUser } from '../../services/authStorage';
import { getDashboardRole } from '../../services/authorization';
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
