import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';

export const seLabel = (rel: ServiceEnvironmentResponse): string => {
    const svc = rel.serviceName || rel.serviceId.slice(0, 8);
    const env = rel.environmentName || rel.environmentId.slice(0, 8);
    return `${svc} / ${env}`;
};
