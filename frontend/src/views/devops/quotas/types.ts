import type { QuotaResponse } from '../../../services/cloudPricerService';

export const PERIODS = ['today', 'daily', 'weekly', 'monthly'] as const;

export interface QuotaWithMetrics extends QuotaResponse {
    metrics?: import('../../../services/devopsService').MetricResponse | null;
}
