export interface EnvironmentResponse {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceResponse {
  id: string;
  name: string;
  type?: string;
  status: string;
  runtime?: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceEnvironmentResponse {
  id: string;
  serviceId: string;
  environmentId: string;
  tenantId: string;
  serviceName?: string;
  environmentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoryEntry {
  id: string;
  userId?: string;
  tenantId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

export interface MetricResponse {
  id: string;
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  pods: number;
  serviceEnvironmentId: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}
