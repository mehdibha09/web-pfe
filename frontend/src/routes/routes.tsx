import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../guard/ProtectedRoute';
import PublicOnlyRoute from '../guard/PublicOnlyRoute';
import ProtectedLayout from '../layout/ProtectedLayout';
import { getStoredUser } from '../services/authStorage';
import {
  canAccessAuditLogs,
  canAccessPermissions,
  canAccessRoles,
  canAccessSessions,
  canAccessTenants,
  canAccessUsers,
} from '../services/authorization';
import AuditLogsPage from '../views/admin/auditLogs/AuditLogsPage.tsx';
import PermissionsPage from '../views/admin/permissions/PermissionsPage.tsx';
import RolesPage from '../views/admin/roles/RolesPage.tsx';
import SessionsPage from '../views/admin/sessions/SessionsPage.tsx';
import TenantsPage from '../views/admin/tenants/TenantsPage.tsx';
import UsersPage from '../views/admin/users/UsersPage.tsx';
import ForgetPassword from '../views/auth/forgetPassword/ForgetPassword';
import Login from '../views/auth/login/Login';
import Profile from '../views/auth/profile/Profile';
import ResetPassword from '../views/auth/resetPassword/ResetPassword';
import SsoCallback from '../views/auth/sso/SsoCallback';
import SsoLogin from '../views/auth/sso/SsoLogin';
import ForbiddenPage from '../views/errors/ForbiddenPage';

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

const routes = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/sso" element={<SsoLogin />} />
        <Route path="/sso/callback/:provider" element={<SsoCallback />} />
        <Route path="/forgetPassword" element={<ForgetPassword />} />
        <Route path="/resetPassword/:token" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/403" element={<ForbiddenPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<Navigate to="/profile" replace />} />
          <Route path="/two-fa" element={<Navigate to="/profile" replace />} />
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default routes;
