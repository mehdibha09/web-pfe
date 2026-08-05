import type {
    EnvironmentResponse,
    MetricResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';

import { C } from '../../../theme/tokens';
export { C };

export const ROWS_PER_PAGE = 10;

export type MetricSummary = {
    cpuUsage: number;
    ramUsage: number;
    networkUsage: number;
    diskUsage: number;
    pods: number;
    [key: string]: unknown;
};

export const toNumberOrNull = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

export const pickSummaryValue = (payload: Record<string, unknown> | null | undefined, keys: string[]) => {
    if (!payload) return null;
    for (const key of keys) {
        const value = toNumberOrNull(payload[key]);
        if (value !== null) return value;
    }
    return null;
};

export const normalizeSummary = (payload: unknown): MetricSummary | null => {
    if (!payload || typeof payload !== 'object') return null;

    const record = payload as Record<string, unknown>;
    const cpuUsage = pickSummaryValue(record, ['cpuUsage', 'averageCpuUsage', 'avgCpuUsage', 'cpuAvg']);
    const ramUsage = pickSummaryValue(record, ['ramUsage', 'averageRamUsage', 'avgRamUsage', 'ramAvg']);
    const networkUsage = pickSummaryValue(record, [
        'networkUsage',
        'averageNetworkUsage',
        'avgNetworkUsage',
        'networkAvg'
    ]);
    const diskUsage = pickSummaryValue(record, ['diskUsage', 'averageDiskUsage', 'avgDiskUsage', 'diskAvg']);
    const pods = pickSummaryValue(record, ['pods', 'averagePods', 'avgPods', 'podCount']);

    if (cpuUsage === null && ramUsage === null && networkUsage === null && diskUsage === null && pods === null) {
        return null;
    }

    return {
        cpuUsage: cpuUsage ?? 0,
        ramUsage: ramUsage ?? 0,
        networkUsage: networkUsage ?? 0,
        diskUsage: diskUsage ?? 0,
        pods: pods ?? 0,
        ...record
    };
};

export const computeSummaryFromHistory = (metrics: MetricResponse[]): MetricSummary | null => {
    if (!metrics.length) return null;

    const sum = metrics.reduce(
        (acc, metric) => {
            acc.cpuUsage += metric.cpuUsage ?? 0;
            acc.ramUsage += metric.ramUsage ?? 0;
            acc.networkUsage += metric.networkUsage ?? 0;
            acc.diskUsage += metric.diskUsage ?? 0;
            acc.pods += metric.pods ?? 0;
            return acc;
        },
        { cpuUsage: 0, ramUsage: 0, networkUsage: 0, diskUsage: 0, pods: 0 }
    );

    return {
        cpuUsage: sum.cpuUsage / metrics.length,
        ramUsage: sum.ramUsage / metrics.length,
        networkUsage: sum.networkUsage / metrics.length,
        diskUsage: sum.diskUsage / metrics.length,
        pods: Math.round(sum.pods / metrics.length)
    };
};

export const formatPct = (value?: number | null) => (typeof value === 'number' ? `${value.toFixed(1)}%` : '-');

export const METRIC_STALE_MS = 60_000;

export const metricTimestamp = (metric?: Pick<MetricResponse, 'timestamp' | 'createdAt' | 'updatedAt'> | null) => {
    if (!metric) return null;
    const raw = metric.timestamp ?? metric.createdAt ?? metric.updatedAt;
    if (!raw) return null;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) ? ts : null;
};

export const isMetricStale = (
    metric?: Pick<MetricResponse, 'timestamp' | 'createdAt' | 'updatedAt'> | null,
    now = Date.now()
) => {
    const ts = metricTimestamp(metric);
    if (ts === null) return true;
    return now - ts > METRIC_STALE_MS;
};

export const formatBps = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    if (value >= 1_048_576) return `${(value / 1_048_576).toFixed(1)} MB/s`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB/s`;
    return `${value.toFixed(0)} B/s`;
};

export const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const toDateInputValue = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

export const serviceEnvironmentLabel = (
    relation: ServiceEnvironmentResponse,
    services: ServiceResponse[],
    environments: EnvironmentResponse[]
) => {
    const serviceName = services.find((s) => s.id === relation.serviceId)?.name ?? '—';
    const environmentName =
        environments.find((e) => e.id === relation.environmentId)?.name ?? '—';

    return `${serviceName} / ${environmentName}`;
};
