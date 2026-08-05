export type VmStatus = 'PENDING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'TERMINATED';

export const VM_OS_OPTIONS = ['UBUNTU_22_04', 'UBUNTU_20_04', 'DEBIAN_11', 'CENTOS_7'] as const;
export type VmOs = (typeof VM_OS_OPTIONS)[number];

export interface Vm {
  id: string;
  name: string;
  displayName?: string;
  cpu: number;
  ram: number;
  disk: number;
  os: VmOs;
  status: VmStatus;
  tenantId: string;
  serviceEnvironmentId: string;
  backupEnabled: boolean;
  ipAddress: string | null;
  networkName: string;
  sshPort: number | null;
  sshUser: string;
  vagrantPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface VmStatusResponse {
  id: string;
  status: VmStatus;
}

export interface CreateVmRequest {
  name?: string;
  displayName?: string;
  cpu: number;
  ram: number;
  disk: number;
  os: VmOs;
  tenantId?: string;
  serviceEnvironmentId: string;
  backupEnabled: boolean;
}

export interface UpdateVmRequest {
  name: string;
  cpu: number;
  ram: number;
  disk: number;
  serviceEnvironmentId: string;
}

export interface VmMetrics {
  cpuUsage: number;
  ramUsage: number;
  networkUsage: number;
  diskUsage: number;
  timestamp?: string;
}
