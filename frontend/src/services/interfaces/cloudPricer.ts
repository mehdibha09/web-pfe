export interface CostBreakdownResponse {
  id: string;
  costRecordId: string;
  type: string;
  unitCost: number;
  quantity: number;
  total: number;
  createdAt: string;
}

export interface CostRecordResponse {
  id: string;
  tenantId: string;
  serviceEnvironmentId: string;
  periodStart: string;
  periodEnd: string;
  mode: string;
  computeCost: number;
  storageCost: number;
  networkCost: number;
  backupCost: number;
  osCost: number;
  totalCost: number;
  breakdowns: CostBreakdownResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotaUsage {
  cpu: number;
  ram: number;
  storage: number;
  pods: number;
  measuredAt: string;
}

export interface QuotaResponse {
  id: string;
  serviceEnvironmentId: string;
  maxCpu: number;
  maxRam: number;
  maxStorage: number;
  maxPods: number;
  maxBudget: number;
  period: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usage?: QuotaUsage | null;
}

export interface QuotaRequest {
  serviceEnvironmentId: string;
  maxCpu: number;
  maxRam: number;
  maxStorage: number;
  maxPods: number;
  maxBudget: number;
  period: string;
  isActive: boolean;
}

export interface AlertResponse {
  id: string;
  tenantId: string;
  serviceEnvironmentId: string;
  type: string;
  metric: string;
  threshold: number;
  actualValue: number;
  severity: string;
  status: string;
  message: string;
  createdAt: string;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
}

export interface AlertRequest {
  tenantId: string;
  serviceEnvironmentId: string;
  type: string;
  metric: string;
  threshold: number;
  actualValue: number;
  severity: string;
  message: string;
}

export interface ForecastResponse {
  id: string;
  tenantId: string;
  serviceEnvironmentId: string;
  period: string;
  predictedCost: number;
  confidenceLevel: number;
  createdAt: string;
}

export interface CostAggregateResponse {
  groupKey: string;
  totalCost: number;
  computeCost: number;
  storageCost: number;
  networkCost: number;
  backupCost: number;
  osCost: number;
  recordCount: number;
}

export interface PriceConfigResponse {
  id: string;
  mode: string;
  resourceType: string;
  pricePerUnit: number;
  unit: string;
  currency: string;
  tenantId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceConfigRequest {
  mode: string;
  resourceType: string;
  pricePerUnit: number;
  unit: string;
  currency: string;
  tenantId?: string;
  isActive: boolean;
}

export interface CalculateCostResponse {
  computeCost: number;
  storageCost: number;
  networkCost: number;
  backupCost: number;
  osCost: number;
  totalCost: number;
}
