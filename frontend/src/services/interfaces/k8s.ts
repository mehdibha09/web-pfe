export interface ProbeConfig {
  enabled: boolean;
  path: string;
  port: number;
  initialDelaySeconds: number;
  periodSeconds: number;
  failureThreshold: number;
}

export interface K8sDeployment {
  id: string;
  name: string;
  dockerImage: string;
  replicas: number;
  port: number;
  targetPort?: number;
  protocol?: string;
  namespace: string;
  tenantId: string;
  status: string;
  serviceEnvironmentId: string;
  envVars?: string;
  secrets?: string;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  imagePullPolicy?: string;
  serviceType?: string;
  restartPolicy?: string;
  labels?: string;
  livenessProbe?: ProbeConfig;
  readinessProbe?: ProbeConfig;
  startupProbe?: ProbeConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface K8sPod {
  name: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  namespace: string;
}

export interface K8sDeploymentRequest {
  name: string;
  dockerImage: string;
  replicas: number;
  port: number;
  targetPort?: number;
  protocol?: string;
  namespace: string;
  tenantId: string;
  serviceEnvironmentId: string;
  envVars?: string;
  secrets?: string;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  imagePullPolicy?: string;
  serviceType?: string;
  restartPolicy?: string;
  labels?: string;
  livenessProbe?: ProbeConfig;
  readinessProbe?: ProbeConfig;
  startupProbe?: ProbeConfig;
}

export interface K8sScaleRequest {
  replicas: number;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  description?: string;
  dockerImage: string;
  port: number;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  envVars?: string;
  labels?: string;
  protocol?: string;
  imagePullPolicy?: string;
  serviceType?: string;
  restartPolicy?: string;
  livenessProbe?: string;
  readinessProbe?: string;
  startupProbe?: string;
  tenantId: string;
  publicTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeploymentTemplateRequest {
  name: string;
  description?: string;
  dockerImage: string;
  port: number;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  envVars?: string;
  labels?: string;
  protocol?: string;
  imagePullPolicy?: string;
  serviceType?: string;
  restartPolicy?: string;
  livenessProbe?: string;
  readinessProbe?: string;
  startupProbe?: string;
  tenantId: string;
  publicTemplate?: boolean;
}

export interface NetworkPolicyRule {
  ipBlocks?: string[];
  namespaceSelectorLabels?: string[];
  podSelectorLabels?: string[];
  ports?: string[];
}

export interface K8sNetworkPolicyRequest {
  name: string;
  namespace: string;
  podSelectorLabels?: string;
  policyTypes: string[];
  ingressRules?: NetworkPolicyRule[];
  egressRules?: NetworkPolicyRule[];
}

export interface K8sNetworkPolicyResponse {
  name: string;
  namespace: string;
  podSelector: string;
  policyTypes: string[];
  ingressRules: string[];
  egressRules: string[];
  createdAt: string;
  apiVersion: string;
}

export interface K8sConfigMapRequest {
  name: string;
  namespace: string;
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface K8sConfigMapResponse {
  name: string;
  namespace: string;
  data: Record<string, string>;
  binaryData: Record<string, string>;
  labels: Record<string, string>;
  dataEntries: number;
  createdAt: string;
  apiVersion: string;
}

export interface K8sServiceAccountRequest {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface K8sServiceAccountResponse {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  secretsCount: number;
  secretNames: string[];
  createdAt: string;
  apiVersion: string;
}

export interface PolicyRule {
  apiGroups?: string[];
  resources?: string[];
  verbs?: string[];
  resourceNames?: string[];
}

export interface K8sRoleRequest {
  name: string;
  namespace?: string;
  isClusterRole: boolean;
  rules: PolicyRule[];
}

export interface K8sRoleResponse {
  name: string;
  namespace: string;
  isClusterRole: boolean;
  rulesSummary: string[];
  rulesCount: number;
  createdAt: string;
  apiVersion: string;
}

export interface RoleBindingSubject {
  kind: string;
  name: string;
  namespace?: string;
}

export interface K8sRoleBindingRequest {
  name: string;
  namespace?: string;
  isClusterBinding: boolean;
  roleKind: string;
  roleName: string;
  subjects: RoleBindingSubject[];
}

export interface K8sRoleBindingResponse {
  name: string;
  namespace: string;
  isClusterBinding: boolean;
  roleRefKind: string;
  roleRefName: string;
  subjectsSummary: string[];
  createdAt: string;
  apiVersion: string;
}

export interface K8sSecretRequest {
  name: string;
  namespace: string;
  type?: string;
  data?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface K8sSecretResponse {
  name: string;
  namespace: string;
  type: string;
  dataKeys: string[];
  dataEntries: number;
  labels: Record<string, string>;
  createdAt: string;
  apiVersion: string;
}

export interface K8sHpaRequest {
  minReplicas: number;
  maxReplicas: number;
  cpuTargetAverageUtilization: number;
  memoryTargetAverageUtilization: number;
}

export interface K8sHpaResponse {
  name: string;
  namespace: string;
  kind: string;
  apiVersion: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  cpuTargetAverageUtilization?: number;
  cpuCurrentAverageUtilization?: number;
  memoryTargetAverageUtilization?: number;
  memoryCurrentAverageUtilization?: number;
  status: string;
}

export interface K8sNamespaceResponse {
  name: string;
  status: string;
  labels: Record<string, string>;
  createdAt: string;
  apiVersion: string;
}

export interface K8sNamespaceRequest {
  name: string;
  labels?: Record<string, string>;
}

export interface K8sServicePort {
  name?: string;
  protocol: string;
  port: number;
  targetPort: number;
  nodePort?: number;
}

export interface K8sServiceResponse {
  name: string;
  namespace: string;
  type: string;
  clusterIp: string;
  externalIps: string[];
  ports: K8sServicePort[];
  selector: Record<string, string>;
  labels: Record<string, string>;
  createdAt: string;
  apiVersion: string;
}

export interface K8sServiceRequest {
  name: string;
  namespace?: string;
  type?: string;
  port: number;
  targetPort?: number;
  protocol?: string;
  selector?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface K8sIngressPath {
  path: string;
  pathType: string;
  serviceName: string;
  servicePort: number;
}

export interface K8sIngressRule {
  host?: string;
  paths: K8sIngressPath[];
}

export interface K8sIngressTLS {
  hosts: string[];
  secretName?: string;
}

export interface K8sIngressResponse {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  ingressClassName?: string;
  rules: K8sIngressRule[];
  tls: K8sIngressTLS[];
  addresses: string[];
  createdAt: string;
  apiVersion: string;
}

export interface K8sIngressRequest {
  name: string;
  namespace?: string;
  ingressClassName?: string;
  rules: K8sIngressRule[];
  tls?: K8sIngressTLS[];
  labels?: Record<string, string>;
}
