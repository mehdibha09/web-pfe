export type {
  VmStatus,
  VmOs,
  Vm,
  VmStatusResponse,
  CreateVmRequest,
  UpdateVmRequest,
  VmMetrics,
} from '../interfaces/vm';
export { VM_OS_OPTIONS } from '../interfaces/vm';

import api from '../axiosInstance';
import type { CreateVmRequest, UpdateVmRequest, Vm, VmStatusResponse } from '../interfaces/vm';
import type { SshExecuteRequest, SshExecuteResponse, SshInfoResponse } from '../interfaces/backup';
import { getStoredUser } from '../authStorage';

const BASE = '/vms';

export const vmService = {
  async getAll(): Promise<Vm[]> {
    const { data } = await api.get<Vm[]>(BASE);
    return data;
  },

  async getAllPaginated(page: number, size: number): Promise<{ items: Vm[]; total: number }> {
    const response = await api.get<Vm[]>(`${BASE}?page=${page}&size=${size}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getById(id: string): Promise<Vm> {
    const { data } = await api.get<Vm>(`${BASE}/${id}`);
    return data;
  },

  async create(payload: CreateVmRequest): Promise<Vm> {
    payload.tenantId = getStoredUser()?.tenantId;
    const { data } = await api.post<Vm>(BASE, payload);
    return data;
  },

  async update(id: string, payload: UpdateVmRequest): Promise<Vm> {
    const { data } = await api.put<Vm>(`${BASE}/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async start(id: string): Promise<Vm> {
    const { data } = await api.post<Vm>(`${BASE}/${id}/start`);
    return data;
  },

  async stop(id: string): Promise<Vm> {
    const { data } = await api.post<Vm>(`${BASE}/${id}/stop`);
    return data;
  },

  async restart(id: string): Promise<Vm> {
    const { data } = await api.post<Vm>(`${BASE}/${id}/restart`);
    return data;
  },

  async getStatus(id: string): Promise<VmStatusResponse> {
    const { data } = await api.get<VmStatusResponse>(`${BASE}/${id}/status`);
    return data;
  },

  async getMetrics(id: string): Promise<any> {
    const { data } = await api.get<any>(`${BASE}/${id}/metrics`);
    return data;
  },

  async sshExecute(id: string, payload: SshExecuteRequest): Promise<SshExecuteResponse> {
    const { data } = await api.post<SshExecuteResponse>(`${BASE}/${id}/ssh/execute`, payload);
    return data;
  },

  async sshInfo(id: string): Promise<SshInfoResponse> {
    const { data } = await api.get<SshInfoResponse>(`${BASE}/${id}/ssh/info`);
    return data;
  },
};
