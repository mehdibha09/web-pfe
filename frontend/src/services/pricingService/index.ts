import axiosInstance from '../axiosInstance';
import type { PriceConfigRequest, PriceConfigResponse, CalculateCostResponse } from '../interfaces/cloudPricer';

export const listPricing = async (mode?: string): Promise<PriceConfigResponse[]> => {
  const params = mode ? `?mode=${encodeURIComponent(mode)}` : '';
  const { data } = await axiosInstance.get(`/pricing${params}`);
  return data || [];
};

export const listPricingPaginated = async (page: number, size: number, mode?: string): Promise<{ items: PriceConfigResponse[]; total: number }> => {
  const base = mode ? `?mode=${encodeURIComponent(mode)}&page=${page}&size=${size}` : `?page=${page}&size=${size}`;
  const { data, pagination } = await axiosInstance.get(`/pricing${base}`);
  return { items: data || [], total: pagination?.totalElements ?? 0 };
};

export const getPricingById = async (id: string): Promise<PriceConfigResponse> => {
  const { data } = await axiosInstance.get(`/pricing/${id}`);
  return data;
};

export const createPricing = async (payload: PriceConfigRequest): Promise<PriceConfigResponse> => {
  const { data } = await axiosInstance.post('/pricing', payload);
  return data;
};

export const updatePricing = async (id: string, payload: PriceConfigRequest): Promise<PriceConfigResponse> => {
  const { data } = await axiosInstance.put(`/pricing/${id}`, payload);
  return data;
};

export const deletePricing = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/pricing/${id}`);
};

export const calculateCost = async (params: {
  mode: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  network_usage?: number;
  backup_size?: number;
  hours?: number;
}): Promise<CalculateCostResponse> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });
  const { data } = await axiosInstance.get(`/pricing/calculate?${searchParams.toString()}`);
  return data;
};
