import type { AuthUser } from './authService';

const normalizeKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const normalizePermission = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const hasRole = (user: AuthUser, roleName: string) =>
  (user.roles || []).map(normalizeKey).includes(normalizeKey(roleName));

const hasPermission = (user: AuthUser, permissionKeyword: string) => {
  const normalizedPermissions = (user.permissions || []).map(normalizePermission);
  const keyword = normalizePermission(permissionKeyword);

  return (
    normalizedPermissions.includes('*') ||
    normalizedPermissions.includes(keyword) ||
    normalizedPermissions.some((permission) => permission.includes(keyword))
  );
};

export const isSuperAdmin = (user: AuthUser) =>
  hasRole(user, 'SUPER_ADMIN') || hasRole(user, 'PLATFORM_ADMIN');

export const isTenantAdmin = (user: AuthUser) => hasRole(user, 'TENANT_ADMIN');

export const canAccessUsers = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'USER');

export const canManageUsers = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'USER_MANAGE');

export const canAccessRoles = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'ROLE');

export const canAccessPermissions = (user: AuthUser) =>
  isSuperAdmin(user) || isTenantAdmin(user) || hasPermission(user, 'PERMISSION');

export const canManagePermissions = (user: AuthUser) =>
  isSuperAdmin(user) ||
  (isPlatformTenant(user) &&
    (hasPermission(user, 'PERMISSION_MANAGE') || hasPermission(user, 'USER_MANAGE')));

export const canAccessTenants = (user: AuthUser) =>
  isSuperAdmin(user) ||
  (hasPermission(user, 'TENANT_MANAGE') &&
    !!user.platformTenantId &&
    user.tenantId === user.platformTenantId);

export const canAccessSessions = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'SESSION');

export const canAccessAuditLogs = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'AUDIT');

export const canDeleteUser = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'USER_DELETE') || hasPermission(user, 'USER_MANAGE');

export const canModifyUserStatus = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'USER_MODIFY_STATUS') || hasPermission(user, 'USER_MANAGE');

export const isAdminRoleName = (roleName?: string | null) =>
  ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'PLATFORM_ADMIN'].includes(
    (roleName || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  );

export const canDeleteRole = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'ROLE_DELETE');

export const canModifyRoleStatus = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'ROLE_MODIFY_STATUS');

export const canRevokeSession = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'SESSION_REVOKE') || hasPermission(user, 'SESSION_MANAGE');

export const canAccessDeployments = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DEPLOYMENT');

export const canManageDeployments = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DEPLOYMENT_MANAGE');

export const canAccessVMs = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'VM');

export const canManageVMs = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'VM_MANAGE');

export const canAccessBackups = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'BACKUP');

export const canManageBackups = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'BACKUP_MANAGE');

export const canAccessK8s = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'K8S');

export const canAccessNamespaces = (user: AuthUser) => isSuperAdmin(user);

export const canManageK8s = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'K8S_MANAGE');

export const isPlatformTenant = (user: AuthUser) =>
  !!user.platformTenantId && user.tenantId === user.platformTenantId;

export const canManageNamespaces = (user: AuthUser) =>
  isSuperAdmin(user) || (canManageK8s(user) && isPlatformTenant(user));

export const canAccessNotifications = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'NOTIFICATION');

export const canManageNotifications = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'NOTIFICATION_MANAGE');

export const canAccessCosts = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'COST');

export const canManageCosts = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'COST_MANAGE');

export const canAccessQuotas = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'QUOTA');

export const canManageQuotas = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'QUOTA_MANAGE');

export const canAccessAlerts = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'ALERT');

export const canManageAlerts = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'ALERT_MANAGE');

export const canAccessMetrics = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'METRIC');

export const canAccessDashboard = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DASHBOARD');

export const canAccessServices = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DEPLOYMENT');

export const canAccessEnvironments = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DEPLOYMENT');

export const canAccessServiceEnvironments = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'DEPLOYMENT');

export type DashboardRole = 'super-admin' | 'tenant-admin' | 'user';

export const canAccessPricing = (user: AuthUser) =>
  isSuperAdmin(user) || (isPlatformTenant(user) && hasPermission(user, 'PRICE_CONFIG_MANAGE'));

export const canManagePricing = (user: AuthUser) =>
  isSuperAdmin(user) || (isPlatformTenant(user) && hasPermission(user, 'PRICE_CONFIG_MANAGE'));

export const getDashboardRole = (user: AuthUser): DashboardRole => {
  if (isSuperAdmin(user)) return 'super-admin';
  if (isTenantAdmin(user)) return 'tenant-admin';
  return 'user';
};
