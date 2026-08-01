export type {
  UserResponse,
  RoleResponse,
  PermissionResponse,
  TenantResponse,
  SessionResponse,
  AuditLogResponse,
  AuditLogQuery,
} from '../interfaces/admin';

import axiosInstance from '../axiosInstance';
import type { AuditLogQuery } from '../interfaces/admin';

export const listUsers = async (): Promise<import('../interfaces/admin').UserResponse[]> => {
  const response = await axiosInstance.get('/users');
  return response.data || [];
};

export const listUsersPaginated = async (page: number, size: number, tenantId?: string): Promise<{ items: import('../interfaces/admin').UserResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (tenantId) params.set('tenantId', tenantId);
  const response = await axiosInstance.get<import('../interfaces/admin').UserResponse[]>(`/users?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createUser = async (payload: { email: string; password: string; status?: string }) => {
  const response = await axiosInstance.post('/users', payload);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await axiosInstance.delete(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId: string, payload: { status?: string; email?: string }) => {
  const response = await axiosInstance.patch(`/users/${userId}`, payload);
  return response.data;
};

export const listUserRoles = async (userId: string): Promise<import('../interfaces/admin').RoleResponse[]> => {
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

export const listRoles = async (): Promise<import('../interfaces/admin').RoleResponse[]> => {
  const response = await axiosInstance.get('/roles');
  return response.data || [];
};

export const listRolesPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/admin').RoleResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  const response = await axiosInstance.get<import('../interfaces/admin').RoleResponse[]>(`/roles?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createRole = async (payload: { name: string; description?: string; permissions?: string[] }) => {
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

export const listPermissions = async (): Promise<import('../interfaces/admin').PermissionResponse[]> => {
  const response = await axiosInstance.get('/permissions?size=2000');
  return response.data || [];
};

export const listPermissionsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/admin').PermissionResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  const response = await axiosInstance.get<import('../interfaces/admin').PermissionResponse[]>(`/permissions?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createPermission = async (payload: { name: string; description?: string }) => {
  const response = await axiosInstance.post('/permissions', payload);
  return response.data;
};

export const updatePermission = async (
  permissionId: string,
  payload: { name?: string; description?: string },
) => {
  const response = await axiosInstance.patch(`/permissions/${permissionId}`, payload);
  return response.data;
};

export const deletePermission = async (permissionId: string) => {
  const response = await axiosInstance.delete(`/permissions/${permissionId}`);
  return response.data;
};

export const getTenantById = async (id: string): Promise<import('../interfaces/admin').TenantResponse> => {
  const response = await axiosInstance.get(`/tenants/${id}`);
  return response.data;
};

export const listTenants = async (): Promise<import('../interfaces/admin').TenantResponse[]> => {
  const response = await axiosInstance.get('/tenants');
  return response.data || [];
};

export const listTenantsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/admin').TenantResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  const response = await axiosInstance.get<import('../interfaces/admin').TenantResponse[]>(`/tenants?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createTenant = async (payload: {
  name: string;
  code?: string;
  contactEmail?: string;
  phone?: string;
  adminEmail?: string;
  adminPassword?: string;
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

export const updateTenant = async (
  tenantId: string,
  payload: { name?: string; code?: string; contactEmail?: string; phone?: string; modeDeployment?: string },
) => {
  const response = await axiosInstance.patch(`/tenants/${tenantId}`, payload);
  return response.data;
};

export const listSessions = async (): Promise<import('../interfaces/admin').SessionResponse[]> => {
  const response = await axiosInstance.get('/sessions?size=2000');
  return response.data || [];
};

export const listSessionsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/admin').SessionResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  const response = await axiosInstance.get<import('../interfaces/admin').SessionResponse[]>(`/sessions?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const revokeSession = async (sessionId: string) => {
  const response = await axiosInstance.delete(`/sessions/${sessionId}`);
  return response.data;
};

export const listAuditLogs = async (query: AuditLogQuery): Promise<import('../interfaces/admin').AuditLogResponse[]> => {
  const params = new URLSearchParams();
  params.set('size', '2000');
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.resource) params.set('resource', query.resource);
  if (query.userId) params.set('userId', query.userId);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await axiosInstance.get(`/audit-logs${suffix}`);
  return response.data || [];
};

export const listAuditLogsPaginated = async (page: number, size: number, query: AuditLogQuery = {}): Promise<{ items: import('../interfaces/admin').AuditLogResponse[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.resource) params.set('resource', query.resource);
  if (query.userId) params.set('userId', query.userId);

  const response = await axiosInstance.get<import('../interfaces/admin').AuditLogResponse[]>(`/audit-logs?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const listAuditResources = async (): Promise<string[]> => {
  const response = await axiosInstance.get('/audit-logs/resources');
  return response.data || [];
};

export const listAuditActions = async (): Promise<string[]> => {
  const response = await axiosInstance.get('/audit-logs/actions');
  return response.data || [];
};
