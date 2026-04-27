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

export const isNormalAdmin = (user: AuthUser) =>
  hasRole(user, 'ADMIN') || hasRole(user, 'ROLE_ADMIN') || hasRole(user, 'MANAGER');

export const canAccessUsers = (user: AuthUser) =>
  isSuperAdmin(user) || isTenantAdmin(user) || isNormalAdmin(user) || hasPermission(user, 'USER');

export const canManageUsers = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'USER_MANAGE');

export const canAccessRoles = (user: AuthUser) =>
  isSuperAdmin(user) || isTenantAdmin(user) || isNormalAdmin(user) || hasPermission(user, 'ROLE');

export const canAccessPermissions = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'PERMISSION');

export const canAccessTenants = (user: AuthUser) =>
  isSuperAdmin(user) || hasPermission(user, 'TENANT_MANAGE');

export const canAccessSessions = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'SESSION');

export const canAccessAuditLogs = (user: AuthUser) =>
  isSuperAdmin(user) || isTenantAdmin(user) || hasPermission(user, 'AUDIT');

export const canDeleteUser = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'USER_DELETE');

export const canModifyUserStatus = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'USER_MODIFY_STATUS');

export const canDeleteRole = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'ROLE_DELETE');

export const canModifyRoleStatus = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'ROLE_MODIFY_STATUS');

export const canRevokeSession = (user: AuthUser) =>
  isSuperAdmin(user) ||
  isTenantAdmin(user) ||
  isNormalAdmin(user) ||
  hasPermission(user, 'SESSION_REVOKE');
