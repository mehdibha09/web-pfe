export type {
  K8sDeployment,
  K8sPod,
  K8sDeploymentRequest,
  K8sScaleRequest,
  K8sHpaRequest,
  K8sHpaResponse,
  K8sNetworkPolicyRequest,
  K8sNetworkPolicyResponse,
  NetworkPolicyRule,
  K8sConfigMapRequest,
  K8sConfigMapResponse,
  K8sServiceAccountRequest,
  K8sServiceAccountResponse,
  PolicyRule,
  K8sRoleRequest,
  K8sRoleResponse,
  RoleBindingSubject,
  K8sRoleBindingRequest,
  K8sRoleBindingResponse,
  K8sSecretRequest,
  K8sSecretResponse,
  DeploymentTemplate,
  DeploymentTemplateRequest,
  ProbeConfig,
} from '../interfaces/k8s';

import axiosInstance from '../axiosInstance';

export const k8sService = {
  async getAll(tenantId?: string): Promise<import('../interfaces/k8s').K8sDeployment[]> {
    const { data } = await axiosInstance.get(tenantId ? `/k8s/deployments?tenantId=${encodeURIComponent(tenantId)}` : '/k8s/deployments');
    return data;
  },

  async getAllPaginated(page: number, size: number, tenantId?: string): Promise<{ items: import('../interfaces/k8s').K8sDeployment[]; total: number }> {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sDeployment[]>(`/k8s/deployments?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getById(id: string): Promise<import('../interfaces/k8s').K8sDeployment> {
    const { data } = await axiosInstance.get(`/k8s/deployments/${id}`);
    return data;
  },

  async create(payload: import('../interfaces/k8s').K8sDeploymentRequest): Promise<import('../interfaces/k8s').K8sDeployment> {
    const { data } = await axiosInstance.post('/k8s/deployments', payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosInstance.delete(`/k8s/deployments/${id}`);
  },

  async scale(id: string, replicas: number): Promise<import('../interfaces/k8s').K8sDeployment> {
    const { data } = await axiosInstance.post(`/k8s/deployments/${id}/scale`, { replicas });
    return data;
  },

  async restart(id: string): Promise<import('../interfaces/k8s').K8sDeployment> {
    const { data } = await axiosInstance.post(`/k8s/deployments/${id}/restart`);
    return data;
  },

  async rollback(id: string, revision?: number): Promise<import('../interfaces/k8s').K8sDeployment> {
    const { data } = await axiosInstance.post(`/k8s/deployments/${id}/rollback`, revision != null ? { revision } : {});
    return data;
  },

  async getStatus(id: string): Promise<any> {
    const { data } = await axiosInstance.get(`/k8s/deployments/${id}/status`);
    return data;
  },

  async getPods(id: string): Promise<import('../interfaces/k8s').K8sPod[]> {
    const { data } = await axiosInstance.get(`/k8s/deployments/${id}/pods`);
    return data;
  },

  async getLogs(id: string): Promise<string> {
    const { data } = await axiosInstance.get<{ logs: string }>(`/k8s/deployments/${id}/logs`);
    return data.logs || '';
  },

  async getEvents(id: string): Promise<string> {
    const { data } = await axiosInstance.get<{ events: string }>(`/k8s/deployments/${id}/events`);
    return data.events || '';
  },

  async configureHpa(id: string, payload: import('../interfaces/k8s').K8sHpaRequest): Promise<import('../interfaces/k8s').K8sHpaResponse> {
    const { data } = await axiosInstance.post(`/k8s/deployments/${id}/hpa`, payload);
    return data;
  },

  async getHpa(id: string): Promise<import('../interfaces/k8s').K8sHpaResponse | null> {
    try {
      const { data } = await axiosInstance.get(`/k8s/deployments/${id}/hpa`);
      return data;
    } catch {
      return null;
    }
  },

  async removeHpa(id: string): Promise<void> {
    await axiosInstance.delete(`/k8s/deployments/${id}/hpa`);
  },

  async listNetworkPolicies(namespace?: string): Promise<import('../interfaces/k8s').K8sNetworkPolicyResponse[]> {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    const { data } = await axiosInstance.get(`/k8s/network-policies${params}`);
    return data;
  },

  async listNetworkPoliciesPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sNetworkPolicyResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sNetworkPolicyResponse[]>(`/k8s/network-policies?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getNetworkPolicy(name: string, namespace?: string): Promise<import('../interfaces/k8s').K8sNetworkPolicyResponse | null> {
    try {
      const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
      const { data } = await axiosInstance.get(`/k8s/network-policies/${name}${ns}`);
      return data;
    } catch { return null; }
  },

  async createNetworkPolicy(payload: import('../interfaces/k8s').K8sNetworkPolicyRequest): Promise<import('../interfaces/k8s').K8sNetworkPolicyResponse> {
    const { data } = await axiosInstance.post('/k8s/network-policies', payload);
    return data;
  },

  async deleteNetworkPolicy(name: string, namespace?: string): Promise<void> {
    const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    await axiosInstance.delete(`/k8s/network-policies/${name}${ns}`);
  },

  async deleteNetworkPoliciesBatch(names: string[], namespace?: string): Promise<void> {
    await axiosInstance.delete('/k8s/network-policies/batch', { data: { names, namespace: namespace ? [namespace] : ['default'] } });
  },

  async listConfigMaps(namespace?: string): Promise<import('../interfaces/k8s').K8sConfigMapResponse[]> {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    const { data } = await axiosInstance.get(`/k8s/configmaps${params}`);
    return data;
  },

  async listConfigMapsPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sConfigMapResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sConfigMapResponse[]>(`/k8s/configmaps?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getConfigMap(name: string, namespace?: string): Promise<import('../interfaces/k8s').K8sConfigMapResponse | null> {
    try {
      const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
      const { data } = await axiosInstance.get(`/k8s/configmaps/${name}${ns}`);
      return data;
    } catch { return null; }
  },

  async createConfigMap(payload: import('../interfaces/k8s').K8sConfigMapRequest): Promise<import('../interfaces/k8s').K8sConfigMapResponse> {
    const { data } = await axiosInstance.post('/k8s/configmaps', payload);
    return data;
  },

  async updateConfigMap(name: string, payload: import('../interfaces/k8s').K8sConfigMapRequest): Promise<import('../interfaces/k8s').K8sConfigMapResponse> {
    const { data } = await axiosInstance.put(`/k8s/configmaps/${name}`, payload);
    return data;
  },

  async deleteConfigMap(name: string, namespace?: string): Promise<void> {
    const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    await axiosInstance.delete(`/k8s/configmaps/${name}${ns}`);
  },

  async deleteConfigMapsBatch(names: string[], namespace?: string): Promise<void> {
    await axiosInstance.delete('/k8s/configmaps/batch', { data: { names, namespace: namespace ? [namespace] : ['default'] } });
  },

  // ── Secrets ──

  async listSecrets(namespace?: string): Promise<import('../interfaces/k8s').K8sSecretResponse[]> {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    const { data } = await axiosInstance.get(`/k8s/secrets${params}`);
    return data;
  },

  async listSecretsPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sSecretResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sSecretResponse[]>(`/k8s/secrets?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getSecret(name: string, namespace?: string): Promise<import('../interfaces/k8s').K8sSecretResponse | null> {
    try {
      const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
      const { data } = await axiosInstance.get(`/k8s/secrets/${name}${ns}`);
      return data;
    } catch { return null; }
  },

  async createSecret(payload: import('../interfaces/k8s').K8sSecretRequest): Promise<import('../interfaces/k8s').K8sSecretResponse> {
    const { data } = await axiosInstance.post('/k8s/secrets', payload);
    return data;
  },

  async updateSecret(name: string, payload: import('../interfaces/k8s').K8sSecretRequest): Promise<import('../interfaces/k8s').K8sSecretResponse> {
    const { data } = await axiosInstance.put(`/k8s/secrets/${name}`, payload);
    return data;
  },

  async deleteSecret(name: string, namespace?: string): Promise<void> {
    const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    await axiosInstance.delete(`/k8s/secrets/${name}${ns}`);
  },

  async deleteSecretsBatch(names: string[], namespace?: string): Promise<void> {
    await axiosInstance.delete('/k8s/secrets/batch', { data: { names, namespace: namespace ? [namespace] : ['default'] } });
  },

  async listTemplates(tenantId?: string): Promise<import('../interfaces/k8s').DeploymentTemplate[]> {
    const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const { data } = await axiosInstance.get(`/deployment-templates${params}`);
    return data;
  },

  async listTemplatesPaginated(page: number, size: number, tenantId?: string): Promise<{ items: import('../interfaces/k8s').DeploymentTemplate[]; total: number }> {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').DeploymentTemplate[]>(`/deployment-templates?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getTemplate(id: string): Promise<import('../interfaces/k8s').DeploymentTemplate> {
    const { data } = await axiosInstance.get(`/deployment-templates/${id}`);
    return data;
  },

  async createTemplate(payload: import('../interfaces/k8s').DeploymentTemplateRequest): Promise<import('../interfaces/k8s').DeploymentTemplate> {
    const { data } = await axiosInstance.post('/deployment-templates', payload);
    return data;
  },

  async updateTemplate(id: string, payload: import('../interfaces/k8s').DeploymentTemplateRequest): Promise<import('../interfaces/k8s').DeploymentTemplate> {
    const { data } = await axiosInstance.put(`/deployment-templates/${id}`, payload);
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await axiosInstance.delete(`/deployment-templates/${id}`);
  },

  // ── Service Accounts ──

  async listServiceAccounts(namespace?: string): Promise<import('../interfaces/k8s').K8sServiceAccountResponse[]> {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    const { data } = await axiosInstance.get(`/k8s/serviceaccounts${params}`);
    return data;
  },

  async listServiceAccountsPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sServiceAccountResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sServiceAccountResponse[]>(`/k8s/serviceaccounts?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async getServiceAccount(name: string, namespace?: string): Promise<import('../interfaces/k8s').K8sServiceAccountResponse | null> {
    try {
      const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
      const { data } = await axiosInstance.get(`/k8s/serviceaccounts/${name}${ns}`);
      return data;
    } catch { return null; }
  },

  async createServiceAccount(payload: import('../interfaces/k8s').K8sServiceAccountRequest): Promise<import('../interfaces/k8s').K8sServiceAccountResponse> {
    const { data } = await axiosInstance.post('/k8s/serviceaccounts', payload);
    return data;
  },

  async deleteServiceAccount(name: string, namespace?: string): Promise<void> {
    const ns = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    await axiosInstance.delete(`/k8s/serviceaccounts/${name}${ns}`);
  },

  // ── Roles ──

  async listRoles(namespace?: string, cluster = false): Promise<import('../interfaces/k8s').K8sRoleResponse[]> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    if (cluster) params.set('cluster', 'true');
    const { data } = await axiosInstance.get(`/k8s/roles?${params}`);
    return data;
  },

  async listRolesPaginated(page: number, size: number, namespace?: string, cluster = false): Promise<{ items: import('../interfaces/k8s').K8sRoleResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    if (cluster) params.set('cluster', 'true');
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sRoleResponse[]>(`/k8s/roles?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async createRole(payload: import('../interfaces/k8s').K8sRoleRequest): Promise<import('../interfaces/k8s').K8sRoleResponse> {
    const { data } = await axiosInstance.post('/k8s/roles', payload);
    return data;
  },

  async deleteRole(name: string, cluster = false, namespace?: string): Promise<void> {
    const params = new URLSearchParams();
    if (cluster) params.set('cluster', 'true');
    if (namespace) params.set('namespace', namespace);
    await axiosInstance.delete(`/k8s/roles/${name}?${params}`);
  },

  // ── RoleBindings ──

  async listRoleBindings(namespace?: string, cluster = false): Promise<import('../interfaces/k8s').K8sRoleBindingResponse[]> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    if (cluster) params.set('cluster', 'true');
    const { data } = await axiosInstance.get(`/k8s/rolebindings?${params}`);
    return data;
  },

  async listRoleBindingsPaginated(page: number, size: number, namespace?: string, cluster = false): Promise<{ items: import('../interfaces/k8s').K8sRoleBindingResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    if (cluster) params.set('cluster', 'true');
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sRoleBindingResponse[]>(`/k8s/rolebindings?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async createRoleBinding(payload: import('../interfaces/k8s').K8sRoleBindingRequest): Promise<import('../interfaces/k8s').K8sRoleBindingResponse> {
    const { data } = await axiosInstance.post('/k8s/rolebindings', payload);
    return data;
  },

  async deleteRoleBinding(name: string, cluster = false, namespace?: string): Promise<void> {
    const params = new URLSearchParams();
    if (cluster) params.set('cluster', 'true');
    if (namespace) params.set('namespace', namespace);
    await axiosInstance.delete(`/k8s/rolebindings/${name}?${params}`);
  },

  // ── Namespaces ──

  async listNamespaces(): Promise<import('../interfaces/k8s').K8sNamespaceResponse[]> {
    const { data } = await axiosInstance.get('/k8s/namespaces');
    return data;
  },

  async listNamespacesPaginated(page: number, size: number): Promise<{ items: import('../interfaces/k8s').K8sNamespaceResponse[]; total: number }> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sNamespaceResponse[]>(`/k8s/namespaces?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async createNamespace(payload: import('../interfaces/k8s').K8sNamespaceRequest): Promise<import('../interfaces/k8s').K8sNamespaceResponse> {
    const { data } = await axiosInstance.post('/k8s/namespaces', payload);
    return data;
  },

  async deleteNamespace(name: string): Promise<void> {
    await axiosInstance.delete(`/k8s/namespaces/${name}`);
  },

  // ── Services ──

  async listServices(namespace?: string): Promise<import('../interfaces/k8s').K8sServiceResponse[]> {
    const params = namespace ? `?namespace=${namespace}` : '';
    const { data } = await axiosInstance.get(`/k8s/services${params}`);
    return data;
  },

  async listServicesPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sServiceResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sServiceResponse[]>(`/k8s/services?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async createService(payload: import('../interfaces/k8s').K8sServiceRequest): Promise<import('../interfaces/k8s').K8sServiceResponse> {
    const { data } = await axiosInstance.post('/k8s/services', payload);
    return data;
  },

  async updateService(name: string, payload: import('../interfaces/k8s').K8sServiceRequest): Promise<import('../interfaces/k8s').K8sServiceResponse> {
    const { data } = await axiosInstance.put(`/k8s/services/${encodeURIComponent(name)}`, payload);
    return data;
  },

  async deleteService(name: string, namespace = 'default'): Promise<void> {
    await axiosInstance.delete(`/k8s/services/${encodeURIComponent(name)}?namespace=${namespace}`);
  },

  // ── Ingresses ──

  async listIngresses(namespace?: string): Promise<import('../interfaces/k8s').K8sIngressResponse[]> {
    const params = namespace ? `?namespace=${namespace}` : '';
    const { data } = await axiosInstance.get(`/k8s/ingresses${params}`);
    return data;
  },

  async listIngressesPaginated(page: number, size: number, namespace?: string): Promise<{ items: import('../interfaces/k8s').K8sIngressResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (namespace) params.set('namespace', namespace);
    params.set('page', String(page));
    params.set('size', String(size));
    const response = await axiosInstance.get<import('../interfaces/k8s').K8sIngressResponse[]>(`/k8s/ingresses?${params}`);
    return { items: response.data || [], total: response.pagination?.totalElements ?? 0 };
  },

  async createIngress(payload: import('../interfaces/k8s').K8sIngressRequest): Promise<import('../interfaces/k8s').K8sIngressResponse> {
    const { data } = await axiosInstance.post('/k8s/ingresses', payload);
    return data;
  },

  async updateIngress(name: string, payload: import('../interfaces/k8s').K8sIngressRequest): Promise<import('../interfaces/k8s').K8sIngressResponse> {
    const { data } = await axiosInstance.put(`/k8s/ingresses/${encodeURIComponent(name)}`, payload);
    return data;
  },

  async deleteIngress(name: string, namespace = 'default'): Promise<void> {
    await axiosInstance.delete(`/k8s/ingresses/${encodeURIComponent(name)}?namespace=${namespace}`);
  }
};
