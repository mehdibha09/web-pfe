export type {
  EnvironmentResponse,
  ServiceResponse,
  ServiceEnvironmentResponse,
  HistoryEntry,
  MetricResponse,
} from '../interfaces/devops';

import axiosInstance from '../axiosInstance';

export const listEnvironments = async (): Promise<import('../interfaces/devops').EnvironmentResponse[]> => {
  const response = await axiosInstance.get('/environments/all');
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
  const response = await axiosInstance.get('/services/all');
  return response.data || [];
};

export const listServicesPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/devops').ServiceResponse[]; total: number }> => {
  const response = await axiosInstance.get<import('../interfaces/devops').ServiceResponse[]>(`/services?page=${page}&size=${size}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const createService = async (payload: { name: string; type?: string; runtime?: string; tenantId: string }) => {
  const response = await axiosInstance.post('/services', payload);
  return response.data;
};

export const updateService = async (
  serviceId: string,
  payload: { name?: string; type?: string; runtime?: string; tenantId?: string }
) => {
  const response = await axiosInstance.put(`/services/${serviceId}`, payload);
  return response.data;
};

export const deleteService = async (serviceId: string) => {
  const response = await axiosInstance.delete(`/services/${serviceId}`);
  return response.data;
};

export const listServiceEnvironments = async (): Promise<import('../interfaces/devops').ServiceEnvironmentResponse[]> => {
  const response = await axiosInstance.get('/service-environments/all');
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

export const listDeploymentHistory = async (): Promise<import('../interfaces/devops').HistoryEntry[]> => {
  const response = await axiosInstance.get('/history?page=0&size=100');
  return response.data || [];
};

export const listDeploymentHistoryPaginated = async (
  page: number,
  size: number,
  query: { from?: string; to?: string; action?: string; resource?: string; userId?: string } = {}
): Promise<{ items: import('../interfaces/devops').HistoryEntry[]; total: number }> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.resource) params.set('resource', query.resource);
  if (query.userId) params.set('userId', query.userId);

  const response = await axiosInstance.get(`/history?${params}`);
  return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
};

export const listMetrics = async (tenantId?: string): Promise<import('../interfaces/devops').MetricResponse[]> => {
  const response = await axiosInstance.get(tenantId ? `/metrics?tenantId=${encodeURIComponent(tenantId)}` : '/metrics');
  return response.data || [];
};

export const getLatestMetric = async (serviceEnvironmentId: string, tenantId?: string): Promise<import('../interfaces/devops').MetricResponse | null> => {
  try {
    const response = await axiosInstance.get(tenantId
      ? `/metrics/latest/${serviceEnvironmentId}?tenantId=${encodeURIComponent(tenantId)}`
      : `/metrics/latest/${serviceEnvironmentId}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const getMetricsHistory = async (serviceEnvironmentId: string, tenantId?: string): Promise<import('../interfaces/devops').MetricResponse[]> => {
  try {
    const response = await axiosInstance.get(tenantId
      ? `/metrics/service-environment/${serviceEnvironmentId}?tenantId=${encodeURIComponent(tenantId)}`
      : `/metrics/service-environment/${serviceEnvironmentId}`);
    return response.data || [];
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
};

export const getMetricsSummary = async (
  serviceEnvironmentId: string,
  tenantId?: string
): Promise<{
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  pods: number;
  [key: string]: any;
} | null> => {
  try {
    const response = await axiosInstance.get(tenantId
      ? `/metrics/summary/${serviceEnvironmentId}?tenantId=${encodeURIComponent(tenantId)}`
      : `/metrics/summary/${serviceEnvironmentId}`);
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
