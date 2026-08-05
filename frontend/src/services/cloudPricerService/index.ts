export type {
  CostBreakdownResponse,
  CostRecordResponse,
  QuotaResponse,
  QuotaRequest,
  AlertResponse,
  ForecastResponse,
  CostAggregateResponse,
} from '../interfaces/cloudPricer';

import axiosInstance from '../axiosInstance';

// ── Cost Records ─────────────────────────────────────────────────────────────
export const listCosts = async (): Promise<import('../interfaces/cloudPricer').CostRecordResponse[]> => {
  const { data } = await axiosInstance.get('/costs');
  return data;
};

export const listCostsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/cloudPricer').CostRecordResponse[]; total: number }> => {
  const { data, pagination } = await axiosInstance.get(`/costs?page=${page}&size=${size}`);
  return { items: data || [], total: pagination?.totalElements ?? 0 };
};

export const getCostById = async (id: string): Promise<import('../interfaces/cloudPricer').CostRecordResponse> => {
  const { data } = await axiosInstance.get(`/costs/${id}`);
  return data;
};

export const generateCostsNow = async (): Promise<{ status: string; message: string }> => {
  const { data } = await axiosInstance.post('/costs/generate');
  return data;
};

// ── Forecast ─────────────────────────────────────────────────────────────────
export const generateForecast = async (
  tenantId: string,
  serviceEnvironmentId: string,
  period: string
): Promise<import('../interfaces/cloudPricer').ForecastResponse> => {
  const { data } = await axiosInstance.get(
    `/costs/forecast?tenantId=${tenantId}&serviceEnvironmentId=${serviceEnvironmentId}&period=${period}`
  );
  return data;
};

export const listForecasts = async (tenantId: string): Promise<import('../interfaces/cloudPricer').ForecastResponse[]> => {
  const { data } = await axiosInstance.get(`/costs/forecast/list?tenantId=${tenantId}`);
  return data;
};

// ── Quotas ───────────────────────────────────────────────────────────────────
export const listQuotas = async (): Promise<import('../interfaces/cloudPricer').QuotaResponse[]> => {
  const { data } = await axiosInstance.get('/quotas');
  return data;
};

export const listQuotasPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/cloudPricer').QuotaResponse[]; total: number }> => {
  const { data, pagination } = await axiosInstance.get(`/quotas?page=${page}&size=${size}`);
  return { items: data || [], total: pagination?.totalElements ?? 0 };
};

export const createQuota = async (payload: import('../interfaces/cloudPricer').QuotaRequest): Promise<import('../interfaces/cloudPricer').QuotaResponse> => {
  const { data } = await axiosInstance.post('/quotas', payload);
  return data;
};

export const updateQuota = async (id: string, payload: import('../interfaces/cloudPricer').QuotaRequest): Promise<import('../interfaces/cloudPricer').QuotaResponse> => {
  const { data } = await axiosInstance.patch(`/quotas/${id}`, payload);
  return data;
};

export const deleteQuota = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/quotas/${id}`);
};

// ── Alerts ───────────────────────────────────────────────────────────────────
export const listAlerts = async (): Promise<import('../interfaces/cloudPricer').AlertResponse[]> => {
  const { data } = await axiosInstance.get('/alerts');
  return data;
};

export const listAlertsPaginated = async (page: number, size: number): Promise<{ items: import('../interfaces/cloudPricer').AlertResponse[]; total: number }> => {
  const { data, pagination } = await axiosInstance.get(`/alerts?page=${page}&size=${size}`);
  return { items: data || [], total: pagination?.totalElements ?? 0 };
};

export const listAlertsByStatus = async (status: string): Promise<import('../interfaces/cloudPricer').AlertResponse[]> => {
  const { data } = await axiosInstance.get(`/alerts/status/${status}`);
  return data;
};

export const listAlertsBySeverity = async (severity: string): Promise<import('../interfaces/cloudPricer').AlertResponse[]> => {
  const { data } = await axiosInstance.get(`/alerts/severity/${severity}`);
  return data;
};

export const acknowledgeAlert = async (id: string): Promise<import('../interfaces/cloudPricer').AlertResponse> => {
  const { data } = await axiosInstance.patch(`/alerts/${id}/acknowledge`);
  return data;
};

export const resolveAlert = async (id: string): Promise<import('../interfaces/cloudPricer').AlertResponse> => {
  const { data } = await axiosInstance.patch(`/alerts/${id}/resolve`);
  return data;
};

export const deleteAlert = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/alerts/${id}`);
};

// ── Cost Aggregation ───────────────────────────────────────────────────────
export const aggregateCostsByTenant = async (): Promise<import('../interfaces/cloudPricer').CostAggregateResponse[]> => {
  const { data } = await axiosInstance.get('/costs/aggregate/tenant');
  return data;
};

export const aggregateCostsByServiceEnvironment = async (): Promise<import('../interfaces/cloudPricer').CostAggregateResponse[]> => {
  const { data } = await axiosInstance.get('/costs/aggregate/service-environment');
  return data;
};

export const aggregateCostsByPeriod = async (): Promise<import('../interfaces/cloudPricer').CostAggregateResponse[]> => {
  const { data } = await axiosInstance.get('/costs/aggregate/period');
  return data;
};

export const aggregateCostsByPeriodForTenant = async (tenantId: string): Promise<import('../interfaces/cloudPricer').CostAggregateResponse[]> => {
  const { data } = await axiosInstance.get(`/costs/aggregate/period/${tenantId}`);
  return data;
};

export const aggregateCostsByServiceEnvironmentForTenant = async (tenantId: string): Promise<import('../interfaces/cloudPricer').CostAggregateResponse[]> => {
  const { data } = await axiosInstance.get(`/costs/aggregate/service-environment/${tenantId}`);
  return data;
};
