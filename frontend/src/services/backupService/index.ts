export type {
  Backup,
  BackupStatus,
  BackupType,
  CreateBackupRequest,
  SshExecuteRequest,
  SshExecuteResponse,
  SshInfoResponse,
} from '../interfaces/backup';

import api from '../axiosInstance';
import type { Backup, CreateBackupRequest } from '../interfaces/backup';

const BASE = '/backups';

export const backupService = {
  async getAll(): Promise<Backup[]> {
    const { data } = await api.get<Backup[]>(BASE);
    return data;
  },

  async getAllPaginated(page: number, size: number): Promise<{ items: Backup[]; total: number }> {
    const response = await api.get<Backup[]>(`${BASE}?page=${page}&size=${size}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getById(id: string): Promise<Backup> {
    const { data } = await api.get<Backup>(`${BASE}/${id}`);
    return data;
  },

  async create(payload: CreateBackupRequest): Promise<Backup> {
    const { data } = await api.post<Backup>(BASE, payload);
    return data;
  },

  async restore(id: string): Promise<Backup> {
    const { data } = await api.post<Backup>(`${BASE}/${id}/restore`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }
};
