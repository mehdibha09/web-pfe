import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';

export const seLabel = (
    rel: ServiceEnvironmentResponse,
    services: ServiceResponse[],
    environments: EnvironmentResponse[]
): string => {
    const svc = services.find((s) => s.id === rel.serviceId)?.name ?? rel.serviceId.slice(0, 8);
    const env = environments.find((e) => e.id === rel.environmentId)?.name ?? rel.environmentId.slice(0, 8);
    return `${svc} / ${env}`;
};
