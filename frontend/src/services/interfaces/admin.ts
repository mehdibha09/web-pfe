export interface UserResponse {
  id: string;
  email: string;
  status: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  createdAt: string;
  permissions: string[];
}

export interface PermissionResponse {
  id: string;
  name: string;
  description: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  phone: string;
  modeDeployment: string;
  status: string;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
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
  anomalies: string[];
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  action: string;
  timestamp: string;
  details: string;
  resource: string;
  resourceId: string;
}

export interface AuditLogQuery {
  from?: string;
  to?: string;
  action?: string;
  resource?: string;
  userId?: string;
}
