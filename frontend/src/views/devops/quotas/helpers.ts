import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';

export const getUsagePercent = (used: number, max: number): number =>
    max > 0 ? Math.min((used / max) * 100, 100) : 0;

export const getBarColor = (pct: number): string =>
    pct >= 90 ? '#C95B6E' : pct >= 75 ? '#8A6A2E' : '#10B981';

export const getBarBg = (pct: number): string =>
    pct >= 90 ? '#F7DEE3' : pct >= 75 ? '#F7ECD6' : '#E0F1E6';

export const seLabel = (
    rel: ServiceEnvironmentResponse,
    services: ServiceResponse[],
    environments: EnvironmentResponse[]
): string => {
    const svc = services.find((s) => s.id === rel.serviceId)?.name ?? rel.serviceId.slice(0, 8);
    const env = environments.find((e) => e.id === rel.environmentId)?.name ?? rel.environmentId.slice(0, 8);
    return `${svc} / ${env}`;
};
