export type {
  EnvironmentResponse,
  ServiceResponse,
  ServiceEnvironmentResponse,
  DeploymentResponse,
  MetricResponse,
} from '../interfaces/devops';

import axiosInstance from '../axiosInstance';

export const listEnvironments = async (): Promise<import('../interfaces/devops').EnvironmentResponse[]> => {
  const response = await axiosInstance.get('/environments');
  return response.data || [];
};

export const listEnvironmentsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/devops').EnvironmentResponse[]; total: number }> => {
  const response = await axiosInstance.get<import('../interfaces/devops').EnvironmentResponse[]>(`/environments?page=${page}&size=${size}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createEnvironment = async (payload: { name: string; description?: string; tenantId: string }) => {
  const response = await axiosInstance.post('/environments', payload);
  return response.data;
};

export const updateEnvironment = async (
  environmentId: string,
  payload: {
    name?: string;
    description?: string;
    tenantId?: string;
  }
) => {
  const response = await axiosInstance.put(`/environments/${environmentId}`, payload);
  return response.data;
};

export const deleteEnvironment = async (environmentId: string) => {
  const response = await axiosInstance.delete(`/environments/${environmentId}`);
  return response.data;
};

export const listServices = async (): Promise<import('../interfaces/devops').ServiceResponse[]> => {
  const response = await axiosInstance.get('/services');
  return response.data || [];
};

export const listServicesPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/devops').ServiceResponse[]; total: number }> => {
  const response = await axiosInstance.get<import('../interfaces/devops').ServiceResponse[]>(`/services?page=${page}&size=${size}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createService = async (payload: { name: string; type?: string; status: string; tenantId: string }) => {
  const response = await axiosInstance.post('/services', payload);
  return response.data;
};

export const updateService = async (
  serviceId: string,
  payload: { name?: string; type?: string; status?: string; tenantId?: string }
) => {
  const response = await axiosInstance.put(`/services/${serviceId}`, payload);
  return response.data;
};

export const deleteService = async (serviceId: string) => {
  const response = await axiosInstance.delete(`/services/${serviceId}`);
  return response.data;
};

export const listServiceEnvironments = async (): Promise<import('../interfaces/devops').ServiceEnvironmentResponse[]> => {
  const response = await axiosInstance.get('/service-environments');
  return response.data || [];
};

export const listServiceEnvironmentsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/devops').ServiceEnvironmentResponse[]; total: number }> => {
  const response = await axiosInstance.get<import('../interfaces/devops').ServiceEnvironmentResponse[]>(`/service-environments?page=${page}&size=${size}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createServiceEnvironment = async (payload: {
  serviceId: string;
  environmentId: string;
  tenantId: string;
}) => {
  const response = await axiosInstance.post('/service-environments', payload);
  return response.data;
};

export const updateServiceEnvironment = async (
  serviceEnvironmentId: string,
  payload: {
    serviceId: string;
    environmentId: string;
    tenantId: string;
  }
) => {
  const response = await axiosInstance.put(`/service-environments/${serviceEnvironmentId}`, payload);
  return response.data;
};

export const deleteServiceEnvironment = async (serviceEnvironmentId: string) => {
  const response = await axiosInstance.delete(`/service-environments/${serviceEnvironmentId}`);
  return response.data;
};

export const listDeployments = async (): Promise<import('../interfaces/devops').DeploymentResponse[]> => {
  const response = await axiosInstance.get('/deployments');
  return response.data || [];
};

export const listDeploymentsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/devops').DeploymentResponse[]; total: number }> => {
  const response = await axiosInstance.get<import('../interfaces/devops').DeploymentResponse[]>(`/deployments?page=${page}&size=${size}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createDeployment = async (payload: {
  version: string;
  notes?: string;
  status: string;
  serviceEnvironmentId: string;
}) => {
  const response = await axiosInstance.post('/deployments', payload);
  return response.data;
};

export const updateDeployment = async (
  deploymentId: string,
  payload: {
    version?: string;
    notes?: string;
    status?: string;
    serviceEnvironmentId?: string;
  }
) => {
  const response = await axiosInstance.put(`/deployments/${deploymentId}`, payload);
  return response.data;
};

export const deleteDeployment = async (deploymentId: string) => {
  const response = await axiosInstance.delete(`/deployments/${deploymentId}`);
  return response.data;
};

export const listMetrics = async (): Promise<import('../interfaces/devops').MetricResponse[]> => {
  const response = await axiosInstance.get('/metrics');
  return response.data || [];
};

export const createMetric = async (payload: {
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  pods: number;
  serviceEnvironmentId: string;
}) => {
  const response = await axiosInstance.post('/metrics', payload);
  return response.data;
};

export const getLatestMetric = async (serviceEnvironmentId: string): Promise<import('../interfaces/devops').MetricResponse | null> => {
  try {
    const response = await axiosInstance.get(`/metrics/latest/${serviceEnvironmentId}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const getMetricsHistory = async (serviceEnvironmentId: string): Promise<import('../interfaces/devops').MetricResponse[]> => {
  try {
    const response = await axiosInstance.get(`/metrics/service-environment/${serviceEnvironmentId}`);
    return response.data || [];
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
};

export const getMetricsSummary = async (
  serviceEnvironmentId: string
): Promise<{
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  pods: number;
  [key: string]: any;
} | null> => {
  try {
    const response = await axiosInstance.get(`/metrics/summary/${serviceEnvironmentId}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const testGet = async (): Promise<any> => {
  const response = await axiosInstance.get('/test');
  return response.data;
};

export const testPostEcho = async (payload: { message: string }): Promise<any> => {
  const response = await axiosInstance.post('/test', payload);
  return response.data;
};

export const redeployDeployment = async (deploymentId: string): Promise<import('../interfaces/devops').DeploymentResponse> => {
  const response = await axiosInstance.post(`/deployments/${deploymentId}/redeploy`);
  return response.data;
};

export const startService = async (serviceId: string): Promise<import('../interfaces/devops').ServiceResponse> => {
  const response = await axiosInstance.post(`/services/${serviceId}/start`);
  return response.data;
};

export const stopService = async (serviceId: string): Promise<import('../interfaces/devops').ServiceResponse> => {
  const response = await axiosInstance.post(`/services/${serviceId}/stop`);
  return response.data;
};

export const restartService = async (serviceId: string): Promise<import('../interfaces/devops').ServiceResponse> => {
  const response = await axiosInstance.post(`/services/${serviceId}/restart`);
  return response.data;
};

// ── Prometheus ─────────────────────────────────────────────────────────────────
export const getPrometheusStatus = async (): Promise<{ reachable: boolean; url: string }> => {
  const response = await axiosInstance.get('/metrics/prometheus/status');
  return response.data;
};

export const prometheusQuery = async (query: string): Promise<{ status: string; data: any }> => {
  const response = await axiosInstance.get(`/metrics/prometheus/query?query=${encodeURIComponent(query)}`);
  return response.data;
};

export const prometheusRangeQuery = async (
  query: string,
  start: string,
  end: string,
  step = '15s'
): Promise<{ status: string; data: any }> => {
  const response = await axiosInstance.get(`/metrics/prometheus/range?query=${encodeURIComponent(query)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&step=${encodeURIComponent(step)}`);
  return response.data;
};
