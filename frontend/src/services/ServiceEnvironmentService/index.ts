export type { ServiceEnvironment } from '../interfaces/serviceEnvironment';

import axiosInstance from '../axiosInstance';
import type { ServiceEnvironment } from '../interfaces/serviceEnvironment';

export const serviceEnvironmentService = {
  getAll: () => axiosInstance.get<ServiceEnvironment[]>('/service-environments').then((r) => r.data),
  getById: (id: string) => axiosInstance.get<ServiceEnvironment>(`/service-environments/${id}`).then((r) => r.data)
};
