import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../guard/ProtectedRoute';
import PublicOnlyRoute from '../guard/PublicOnlyRoute';
import ProtectedLayout from '../layout/ProtectedLayout';
import { getStoredUser, isAuthenticated } from '../services/core/authStorage';

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
    canAccessVMs
} from '../services/core/authorization';

/* Lazy loaded — all pages */
const AuditLogsPage = lazy(() => import('../views/admin/auditLogs/AuditLogsPage'));
const PermissionsPage = lazy(() => import('../views/admin/permissions/PermissionsPage'));
const RolesPage = lazy(() => import('../views/admin/roles/RolesPage'));
const SessionsPage = lazy(() => import('../views/admin/sessions/SessionsPage'));
const TenantsPage = lazy(() => import('../views/admin/tenants/TenantsPage'));
const UsersPage = lazy(() => import('../views/admin/users/UsersPage'));
const DashboardPrincipal = lazy(() => import('../views/dashboard/DashboardPrincipal'));

const Login = lazy(() => import('../views/auth/login/Login'));
const Profile = lazy(() => import('../views/auth/profile/Profile'));
const ForgetPassword = lazy(() => import('../views/auth/forgetPassword/ForgetPassword'));
const ResetPassword = lazy(() => import('../views/auth/resetPassword/ResetPassword'));
const TwoFactor = lazy(() => import('../views/auth/twoFactor/TwoFactor'));

const DevopsDashboardPage = lazy(() => import('../views/devops/dashboard/DevopsDashboardPage'));
const DevOpsVmsPage = lazy(() => import('../views/devops/vm/VmPage'));
const PricingPage = lazy(() => import('../views/admin/pricing/PricingPage'));
const ForbiddenPage = lazy(() => import('../views/errors/ForbiddenPage'));
const NotFoundPage = lazy(() => import('../views/errors/NotFoundPage'));

/* Lazy loaded DevOps pages */
const DevOpsServicesPage = lazy(() => import('../views/devops/services/DevopsServicesPage'));
const DevOpsEnvironmentsPage = lazy(() => import('../views/devops/environments/EnvironmentsPage'));
const DevOpsServiceEnvironmentsPage = lazy(() => import('../views/devops/service-environments/ServiceEnvironmentsPage'));
const DevOpsMetricsPage = lazy(() => import('../views/devops/metrics/MetricsPage'));
const DevOpsBackupsPage = lazy(() => import('../views/devops/backups/BackupPage'));
const DevOpsK8sPage = lazy(() => import('../views/devops/k8s/K8sPage'));
const DevOpsCostsPage = lazy(() => import('../views/devops/costs/CostsPage'));
const DevOpsQuotasPage = lazy(() => import('../views/devops/quotas/QuotasPage'));
const DevOpsAlertsPage = lazy(() => import('../views/devops/alerts/AlertsPage'));
const DevOpsNotificationsPage = lazy(() => import('../views/devops/notifications/NotificationsPage'));
const DevOpsMonitoringTempsReelPage = lazy(() => import('../views/devops/monitoring/MonitoringTempsReelPage'));

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

const AppRoutes = () => {
    return (
        <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner variant="page" />}>
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
                        <Route path="/admin/devops/dashboard" element={<AdminAccessRoute canAccess={canAccessDashboard}><DevopsDashboardPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/services" element={<AdminAccessRoute canAccess={canAccessServices}><DevOpsServicesPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/environments" element={<AdminAccessRoute canAccess={canAccessEnvironments}><DevOpsEnvironmentsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/service-environments" element={<AdminAccessRoute canAccess={canAccessServiceEnvironments}><DevOpsServiceEnvironmentsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/metrics" element={<AdminAccessRoute canAccess={canAccessMetrics}><DevOpsMetricsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/vms" element={<AdminAccessRoute canAccess={canAccessVMs}><DevOpsVmsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/backups" element={<AdminAccessRoute canAccess={canAccessBackups}><DevOpsBackupsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/k8s" element={<AdminAccessRoute canAccess={canAccessK8s}><DevOpsK8sPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/costs" element={<AdminAccessRoute canAccess={canAccessCosts}><DevOpsCostsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/quotas" element={<AdminAccessRoute canAccess={canAccessQuotas}><DevOpsQuotasPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/alerts" element={<AdminAccessRoute canAccess={canAccessAlerts}><DevOpsAlertsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/notifications" element={<AdminAccessRoute canAccess={canAccessNotifications}><DevOpsNotificationsPage /></AdminAccessRoute>} />
                        <Route path="/admin/devops/monitoring" element={<AdminAccessRoute canAccess={canAccessMetrics}><DevOpsMonitoringTempsReelPage /></AdminAccessRoute>} />
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
