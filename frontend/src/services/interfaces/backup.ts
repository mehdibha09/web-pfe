export type BackupStatus = 'COMPLETED' | 'RESTORED' | 'FAILED';
export type BackupType = 'MANUAL' | 'AUTOMATIC';

export interface Backup {
  id: string;
  vmId: string;
  serviceEnvironmentId: string;
  status: BackupStatus;
  filePath: string;
  sizeMb: number;
  type: BackupType;
  notes: string;
  createdAt: string;
  updatedAt: string;
  restoredAt: string | null;
}

export interface CreateBackupRequest {
  vmId: string;
  serviceEnvironmentId: string;
  notes?: string;
  frequency?: string;
  retentionDays?: number;
  maintenanceWindow?: string;
}

export interface SshExecuteRequest {
  command: string;
}

export interface SshExecuteResponse {
  vmId: string;
  command: string;
  output: string;
  exitCode: number;
}

export interface SshInfoResponse {
  host: string;
  port: number;
  user: string;
  privateKeyPath: string;
}
