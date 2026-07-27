import type { QuotaResponse } from '../../../services/cloudPricerService';
import type { MetricResponse } from '../../../services/devopsService';

export const PERIODS = ['daily', 'weekly', 'monthly'] as const;

export interface QuotaWithMetrics extends QuotaResponse {
    metrics?: MetricResponse | null;
}
