import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from '../components/ErrorBoundary';
import ProtectedRoute from '../guard/ProtectedRoute';
import PublicOnlyRoute from '../guard/PublicOnlyRoute';
import ProtectedLayout from '../layout/ProtectedLayout';
import { getStoredUser, isAuthenticated } from '../services/authStorage';

import {
    canAccessAuditLogs,
    canAccessPermissions,
    canAccessPricing,
    canAccessRoles,
    canAccessSessions,
    canAccessTenants,
    canAccessUsers
} from '../services/authorization';

import AuditLogsPage from '../views/admin/auditLogs/AuditLogsPage.tsx';
import PermissionsPage from '../views/admin/permissions/PermissionsPage.tsx';
import RolesPage from '../views/admin/roles/RolesPage.tsx';
import SessionsPage from '../views/admin/sessions/SessionsPage.tsx';
import TenantsPage from '../views/admin/tenants/TenantsPage.tsx';
import UsersPage from '../views/admin/users/UsersPage.tsx';
import DashboardPrincipal from '../views/dashboard/DashboardPrincipal';

import ForgetPassword from '../views/auth/forgetPassword/ForgetPassword';
import Login from '../views/auth/login/Login';
import Profile from '../views/auth/profile/Profile';
import ResetPassword from '../views/auth/resetPassword/ResetPassword';
// import SsoCallback from '../views/auth/sso/SsoCallback';
// import SsoLogin from '../views/auth/sso/SsoLogin';
import TwoFactor from '../views/auth/twoFactor';
import DevopsDashboardPage from '../views/devops/dashboard/DevopsDashboardPage';
import ForbiddenPage from '../views/errors/ForbiddenPage';
import NotFoundPage from '../views/errors/NotFoundPage';
import DevOpsVmsPage from '../views/devops/vm/VmPage';
import PricingPage from '../views/admin/pricing/PricingPage';

type AdminAccessRouteProps = {
    canAccess: (user: NonNullable<ReturnType<typeof getStoredUser>>) => boolean;
    children: ReactNode;
};

const AdminAccessRoute = ({ canAccess, children }: AdminAccessRouteProps) => {
    const user = getStoredUser();

    if (!user || !canAccess(user)) {
        return <Navigate to="/403" replace />;
    }

    return <>{children}</>;
};

/* Lazy loaded DevOps pages */
const DevOpsServicesPage = lazy(() => import('../views/devops/services/DevopsServicesPage'));
const DevOpsEnvironmentsPage = lazy(() => import('../views/devops/environments/EnvironmentsPage'));
const DevOpsServiceEnvironmentsPage = lazy(() => import('../views/devops/service-environments/ServiceEnvironmentsPage'));
const DevOpsDeploymentsPage = lazy(() => import('../views/devops/deployments/DeploymentsPage'));
const DevOpsMetricsPage = lazy(() => import('../views/devops/metrics/MetricsPage'));
const DevOpsBackupsPage = lazy(() => import('../views/devops/backups/BackupPage'));
const DevOpsK8sPage = lazy(() => import('../views/devops/k8s/K8sPage'));
const DevOpsCostsPage = lazy(() => import('../views/devops/costs/CostsPage'));
const DevOpsQuotasPage = lazy(() => import('../views/devops/quotas/QuotasPage'));
const DevOpsAlertsPage = lazy(() => import('../views/devops/alerts/AlertsPage'));
const DevOpsNotificationsPage = lazy(() => import('../views/devops/notifications/NotificationsPage'));
const DevOpsMonitoringTempsReelPage = lazy(() => import('../views/devops/monitoring/MonitoringTempsReelPage'));

const AppRoutes = () => {
    return (
        <ErrorBoundary>
        <Suspense fallback={null}>
            <Routes>
                {/* Root redirect based on auth */}
                <Route
                    path="/"
                    element={
                        getStoredUser()
                            ? <Navigate to="/admin/devops/dashboard" replace />
                            : <Navigate to="/login" replace />
                    }
                />

                {/* Public routes */}
                <Route element={<PublicOnlyRoute />}>
                    <Route path="/login" element={<Login />} />
                    {/* <Route path="/sso" element={<SsoLogin />} /> */}
                    {/* <Route path="/sso/callback/:provider" element={<SsoCallback />} /> */}
                    <Route path="/forgetPassword" element={<ForgetPassword />} />
                    <Route path="/resetPassword/:token" element={<ResetPassword />} />
                    <Route path="/two-fa" element={<TwoFactor />} />
                </Route>

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/403" element={<ForbiddenPage />} />

                    <Route element={<ProtectedLayout />}>
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/change-password" element={<Navigate to="/profile" replace />} />
                        <Route path="/admin/dashboard" element={<DashboardPrincipal />} />

                        <Route
                            path="/admin/users"
                            element={
                                <AdminAccessRoute canAccess={canAccessUsers}>
                                    <UsersPage />
                                </AdminAccessRoute>
                            }
                        />

                        <Route
                            path="/admin/roles"
                            element={
                                <AdminAccessRoute canAccess={canAccessRoles}>
                                    <RolesPage />
                                </AdminAccessRoute>
                            }
                        />

                        <Route
                            path="/admin/permissions"
                            element={
                                <AdminAccessRoute canAccess={canAccessPermissions}>
                                    <PermissionsPage />
                                </AdminAccessRoute>
                            }
                        />

                        <Route
                            path="/admin/tenants"
                            element={
                                <AdminAccessRoute canAccess={canAccessTenants}>
                                    <TenantsPage />
                                </AdminAccessRoute>
                            }
                        />
                        <Route
                            path="/admin/sessions"
                            element={
                                <AdminAccessRoute canAccess={canAccessSessions}>
                                    <SessionsPage />
                                </AdminAccessRoute>
                            }
                        />

                        <Route
                            path="/admin/audit-logs"
                            element={
                                <AdminAccessRoute canAccess={canAccessAuditLogs}>
                                    <AuditLogsPage />
                                </AdminAccessRoute>
                            }
                        />

                        <Route
                            path="/admin/pricing"
                            element={
                                <AdminAccessRoute canAccess={canAccessPricing}>
                                    <PricingPage />
                                </AdminAccessRoute>
                            }
                        />

                        {/* DevOps mini-Kubernetes dashboard */}
                        <Route path="/admin/devops/dashboard" element={<DevopsDashboardPage />} />
                        <Route path="/admin/devops/services" element={<DevOpsServicesPage />} />
                        <Route path="/admin/devops/environments" element={<DevOpsEnvironmentsPage />} />
                        <Route path="/admin/devops/service-environments" element={<DevOpsServiceEnvironmentsPage />} />
                        <Route path="/admin/devops/deployments" element={<DevOpsDeploymentsPage />} />
                        <Route path="/admin/devops/metrics" element={<DevOpsMetricsPage />} />
                        <Route path="/admin/devops/vms" element={<DevOpsVmsPage />} />
                        <Route path="/admin/devops/backups" element={<DevOpsBackupsPage />} />
                        <Route path="/admin/devops/k8s" element={<DevOpsK8sPage />} />
                        <Route path="/admin/devops/costs" element={<DevOpsCostsPage />} />
                        <Route path="/admin/devops/quotas" element={<DevOpsQuotasPage />} />
                        <Route path="/admin/devops/alerts" element={<DevOpsAlertsPage />} />
                        <Route path="/admin/devops/notifications" element={<DevOpsNotificationsPage />} />
                        <Route path="/admin/devops/monitoring" element={<DevOpsMonitoringTempsReelPage />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
        </ErrorBoundary>
    );
};

export default AppRoutes;
