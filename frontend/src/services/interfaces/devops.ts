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
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceEnvironmentResponse {
  id: string;
  serviceId: string;
  environmentId: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeploymentResponse {
  id: string;
  version: string;
  notes?: string;
  status: string;
  serviceEnvironmentId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetricResponse {
  id: string;
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  pods: number;
  serviceEnvironmentId: string;
  createdAt?: string;
  updatedAt?: string;
}
