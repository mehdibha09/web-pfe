import axiosInstance from './axiosInstance';

export type UserResponse = {
  id: string;
  email: string;
  status: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  updatedAt: string;
};

export type RoleResponse = {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  createdAt: string;
  permissions: string[];
};

export type PermissionResponse = {
  id: string;
  name: string;
  description: string;
};

export type TenantResponse = {
  id: string;
  name: string;
  contactEmail: string;
  modeDeployment: string;
  status: string;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionResponse = {
  id: string;
  userId: string;
  userEmail: string;
  accessToken: string;
  refreshToken: string;
  expirationDate: string;
  createdAt: string;
  ipAddress: string;
  browser: string;
  os: string;
  localization: string;
  revokedAt: string | null;
};

export type AuditLogResponse = {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  action: string;
  timestamp: string;
  details: string;
  resource: string;
  resourceId: string;
};

export const listUsers = async (): Promise<UserResponse[]> => {
  const response = await axiosInstance.get('/users');
  return response.data || [];
};

export const createUser = async (payload: { email: string; password: string; status?: string }) => {
  const response = await axiosInstance.post('/users', payload);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await axiosInstance.delete(`/users/${userId}`);
  return response.data;
};

export const listUserRoles = async (userId: string): Promise<RoleResponse[]> => {
  const response = await axiosInstance.get(`/users/${userId}/roles`);
  return response.data || [];
};

export const assignRoleToUser = async (userId: string, roleId: string) => {
  const response = await axiosInstance.post(`/users/${userId}/roles`, { roleId });
  return response.data;
};

export const removeRoleFromUser = async (userId: string, roleId: string) => {
  const response = await axiosInstance.delete(`/users/${userId}/roles/${roleId}`);
  return response.data;
};

export const replaceUserRoles = async (userId: string, roleIds: string[]) => {
  const response = await axiosInstance.patch(`/users/${userId}/roles`, { roleIds });
  return response.data;
};

export const listRoles = async (): Promise<RoleResponse[]> => {
  const response = await axiosInstance.get('/roles');
  return response.data || [];
};

export const createRole = async (payload: { name: string; description?: string }) => {
  const response = await axiosInstance.post('/roles', payload);
  return response.data;
};

export const deleteRole = async (roleId: string) => {
  const response = await axiosInstance.delete(`/roles/${roleId}`);
  return response.data;
};

export const updateRole = async (
  roleId: string,
  payload: { name?: string; description?: string },
) => {
  const response = await axiosInstance.patch(`/roles/${roleId}`, payload);
  return response.data;
};

export const addPermissionToRole = async (
  roleId: string,
  payload: { permissionId?: string; permissionName?: string; description?: string },
) => {
  const response = await axiosInstance.post(`/roles/${roleId}/permissions`, payload);
  return response.data;
};

export const removePermissionFromRole = async (roleId: string, permissionId: string) => {
  const response = await axiosInstance.delete(`/roles/${roleId}/permissions/${permissionId}`);
  return response.data;
};

export const listPermissions = async (): Promise<PermissionResponse[]> => {
  const response = await axiosInstance.get('/permissions');
  return response.data || [];
};

export const createPermission = async (payload: { name: string; description?: string }) => {
  const response = await axiosInstance.post('/permissions', payload);
  return response.data;
};

export const deletePermission = async (permissionId: string) => {
  const response = await axiosInstance.delete(`/permissions/${permissionId}`);
  return response.data;
};

export const listTenants = async (): Promise<TenantResponse[]> => {
  const response = await axiosInstance.get('/tenants');
  return response.data || [];
};

export const createTenant = async (payload: {
  name: string;
  contactEmail?: string;
  modeDeployment?: string;
  status?: string;
}) => {
  const response = await axiosInstance.post('/tenants', payload);
  return response.data;
};

export const disableTenant = async (tenantId: string) => {
  const response = await axiosInstance.delete(`/tenants/${tenantId}`);
  return response.data;
};

export const updateTenantStatus = async (tenantId: string, status: 'ACTIVE' | 'DELETED') => {
  const response = await axiosInstance.patch(`/tenants/${tenantId}`, { status });
  return response.data;
};

export const listSessions = async (): Promise<SessionResponse[]> => {
  const response = await axiosInstance.get('/sessions');
  return response.data || [];
};

export const revokeSession = async (sessionId: string) => {
  const response = await axiosInstance.delete(`/sessions/${sessionId}`);
  return response.data;
};

export type AuditLogQuery = {
  from?: string;
  to?: string;
  action?: string;
  resource?: string;
  userId?: string;
};

export const listAuditLogs = async (query: AuditLogQuery): Promise<AuditLogResponse[]> => {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.resource) params.set('resource', query.resource);
  if (query.userId) params.set('userId', query.userId);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await axiosInstance.get(`/audit-logs${suffix}`);
  return response.data || [];
};

export const listAuditResources = async (): Promise<string[]> => {
  const response = await axiosInstance.get('/audit-logs/resources');
  return response.data || [];
};
