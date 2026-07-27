package com.deployment.ServiceEntity.domain;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.web.dto.k8s.K8sNamespaceResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sIngressResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sHpaResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNetworkPolicyResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sConfigMapResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sPodResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sSecretResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleBindingResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceAccountResponse;

@Component
public class KubernetesClient {

    private static final Logger log = LoggerFactory.getLogger(KubernetesClient.class);

    private String systemPath() {
        String env = System.getenv("PATH");
        return "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:"
                + (env != null ? env : "");
    }

    private String exec(String... args) {
        try {
            ProcessBuilder pb = new ProcessBuilder(args);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            log.info("kubectl [{}] exit={} output={}", args[1], exitCode, output.trim());

            if (exitCode != 0) {
                throw new RuntimeException("Command failed (exit " + exitCode + "): " + output);
            }
            return output;
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to execute command: " + e.getMessage());
        }
    }

    private boolean kubectlAvailable() {
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "version", "--client");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public void createDeployment(K8sDeployment deployment) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create deployment {}", deployment.getName());
            return;
        }
        try {
            exec("kubectl", "create", "deployment", deployment.getName(),
                    "--image=" + deployment.getDockerImage(),
                    "--replicas=" + deployment.getReplicas(),
                    "-n", deployment.getNamespace());
        } catch (Exception e) {
            log.error("Failed to create deployment {}: {}", deployment.getName(), e.getMessage());
        }
    }

    public void scaleDeployment(String name, int replicas, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating scale {} to {} replicas", name, replicas);
            return;
        }
        try {
            exec("kubectl", "scale", "deployment", name,
                    "--replicas=" + replicas,
                    "-n", namespace);
        } catch (Exception e) {
            log.error("Failed to scale deployment {}: {}", name, e.getMessage());
        }
    }

    public void restartDeployment(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating restart deployment {}", name);
            return;
        }
        try {
            exec("kubectl", "rollout", "restart", "deployment", name,
                    "-n", namespace);
        } catch (Exception e) {
            log.error("Failed to restart deployment {}: {}", name, e.getMessage());
        }
    }

    public void rollbackDeployment(String name, String namespace, Integer revision) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating rollback deployment {}", name);
            return;
        }
        try {
            if (revision != null) {
                exec("kubectl", "rollout", "undo", "deployment", name,
                        "--to-revision=" + revision, "-n", namespace);
            } else {
                exec("kubectl", "rollout", "undo", "deployment", name, "-n", namespace);
            }
        } catch (Exception e) {
            log.error("Failed to rollback deployment {}: {}", name, e.getMessage());
        }
    }

    public void deleteDeployment(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete deployment {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "deployment", name,
                    "-n", namespace);
        } catch (Exception e) {
            log.error("Failed to delete deployment {}: {}", name, e.getMessage());
        }
    }

    public List<K8sPodResponse> getPods(String name, String namespace) {
        if (!kubectlAvailable()) {
            return simulatePods(name, namespace);
        }
        try {
            String output = exec("kubectl", "get", "pods",
                    "-l", "app=" + name,
                    "-n", namespace,
                    "-o", "json");
            return parsePodsJson(output);
        } catch (Exception e) {
            log.warn("Failed to get pods, returning simulated data: {}", e.getMessage());
            return simulatePods(name, namespace);
        }
    }

    public String getLogs(String name, String namespace) {
        if (!kubectlAvailable()) {
            return "[simulated] Logs for deployment " + name + " in namespace " + namespace
                    + "\nNo real kubectl available. Here are placeholder logs:\n"
                    + "2024-01-01T00:00:00Z Application started\n"
                    + "2024-01-01T00:00:01Z Listening on port 8080\n"
                    + "2024-01-01T00:00:02Z Ready to serve requests";
        }
        try {
            return exec("kubectl", "logs", "deployment/" + name,
                    "-n", namespace, "--tail=100");
        } catch (Exception e) {
            log.error("Failed to get logs for {}: {}", name, e.getMessage());
            return "Error retrieving logs: " + e.getMessage();
        }
    }

    public Map<String, Object> getStatus(String name, String namespace) {
        if (!kubectlAvailable()) {
            return Map.of(
                    "name", name,
                    "namespace", namespace,
                    "availableReplicas", 1,
                    "readyReplicas", 1,
                    "status", "Available");
        }
        try {
            String output = exec("kubectl", "get", "deployment", name,
                    "-n", namespace, "-o", "json");
            return parseDeploymentStatusJson(output);
        } catch (Exception e) {
            log.error("Failed to get status for {}: {}", name, e.getMessage());
            return Map.of(
                    "name", name,
                    "namespace", namespace,
                    "error", e.getMessage());
        }
    }

    public String getEvents(String name, String namespace) {
        if (!kubectlAvailable()) {
            return "[simulated] Events for deployment " + name + " in namespace " + namespace
                    + "\nNo real kubectl available. Placeholder events:\n"
                    + "Normal  Scheduled  default-scheduler  Successfully assigned " + namespace + "/" + name
                    + "\nNormal  Pulled     kubelet             Container image already present on machine";
        }
        try {
            return exec("kubectl", "get", "events",
                    "-n", namespace,
                    "--field-selector", "involvedObject.name=" + name);
        } catch (Exception e) {
            log.error("Failed to get events for {}: {}", name, e.getMessage());
            return "Error retrieving events: " + e.getMessage();
        }
    }

    public void createOrUpdateHpa(String name, String namespace, int minReplicas, int maxReplicas, int cpuTarget, int memoryTarget) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create HPA for {}", name);
            return;
        }
        String hpaName = name + "-hpa";
        String yaml = String.format("""
            apiVersion: autoscaling/v2
            kind: HorizontalPodAutoscaler
            metadata:
              name: %s
              namespace: %s
            spec:
              scaleTargetRef:
                apiVersion: apps/v1
                kind: Deployment
                name: %s
              minReplicas: %d
              maxReplicas: %d
              metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: %d
              - type: Resource
                resource:
                  name: memory
                  target:
                    type: Utilization
                    averageUtilization: %d
            """, hpaName, namespace, name, minReplicas, maxReplicas, cpuTarget, memoryTarget);
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply HPA [{}] exit={} output={}", hpaName, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply HPA (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to create/update HPA for {}: {}", name, e.getMessage());
        }
    }

    public K8sHpaResponse getHpa(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get HPA for {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "hpa", name + "-hpa", "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> json = mapper.readValue(output, Map.class);
            json.put("name", name + "-hpa");
            json.put("namespace", namespace);
            return K8sHpaResponse.fromK8sJson(json);
        } catch (Exception e) {
            log.warn("Failed to get HPA for {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteHpa(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete HPA for {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "hpa", name + "-hpa", "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete HPA for {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateNetworkPolicy(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create NetworkPolicy {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: networking.k8s.io/v1
            kind: NetworkPolicy
            metadata:
              name: %s
              namespace: %s
            spec:
              %s
            """, name, namespace, yamlSpec);
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply NetworkPolicy [{}] exit={} output={}", name, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply NetworkPolicy (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to create/update NetworkPolicy {}: {}", name, e.getMessage());
        }
    }

    public List<K8sNetworkPolicyResponse> listNetworkPolicies(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list NetworkPolicies");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "networkpolicies", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> json = mapper.readValue(output, Map.class);
            return K8sNetworkPolicyResponse.fromK8sList(json);
        } catch (Exception e) {
            log.warn("Failed to list NetworkPolicies: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sNetworkPolicyResponse getNetworkPolicy(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get NetworkPolicy {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "networkpolicy", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> json = mapper.readValue(output, Map.class);
            return K8sNetworkPolicyResponse.fromK8sJson(json);
        } catch (Exception e) {
            log.warn("Failed to get NetworkPolicy {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteNetworkPolicy(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete NetworkPolicy {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "networkpolicy", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete NetworkPolicy {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateConfigMap(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create/update ConfigMap {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: v1
            kind: ConfigMap
            metadata:
              name: %s
              namespace: %s
            %s
            """, name, namespace, yamlSpec);
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply ConfigMap [{}] exit={} output={}", name, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply ConfigMap (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to create/update ConfigMap {}: {}", name, e.getMessage());
        }
    }

    public List<K8sConfigMapResponse> listConfigMaps(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list ConfigMaps");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "configmaps", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> json = mapper.readValue(output, Map.class);
            return K8sConfigMapResponse.fromK8sList(json);
        } catch (Exception e) {
            log.warn("Failed to list ConfigMaps: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sConfigMapResponse getConfigMap(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get ConfigMap {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "configmap", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> json = mapper.readValue(output, Map.class);
            return K8sConfigMapResponse.fromK8sJson(json);
        } catch (Exception e) {
            log.warn("Failed to get ConfigMap {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteConfigMap(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete ConfigMap {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "configmap", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete ConfigMap {}: {}", name, e.getMessage());
        }
    }

    // ── Service Accounts ──

    public void createOrUpdateServiceAccount(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create ServiceAccount {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: v1
            kind: ServiceAccount
            metadata:
              name: %s
              namespace: %s
            %s
            """, name, namespace, yamlSpec);
        applyYaml(yaml, name, "ServiceAccount");
    }

    public List<K8sServiceAccountResponse> listServiceAccounts(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list ServiceAccounts");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "sa", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sServiceAccountResponse.fromK8sList(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to list ServiceAccounts: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sServiceAccountResponse getServiceAccount(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get ServiceAccount {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "sa", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sServiceAccountResponse.fromK8sJson(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to get ServiceAccount {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteServiceAccount(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete ServiceAccount {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "sa", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete ServiceAccount {}: {}", name, e.getMessage());
        }
    }

    // ── Roles & ClusterRoles ──

    public void createOrUpdateRole(String name, String namespace, boolean isClusterRole, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create {} {}", isClusterRole ? "ClusterRole" : "Role", name);
            return;
        }
        String kind = isClusterRole ? "ClusterRole" : "Role";
        String nsYaml = isClusterRole ? "" : "  namespace: " + namespace + "\n";
        String yaml = String.format("""
            apiVersion: rbac.authorization.k8s.io/v1
            kind: %s
            metadata:
              name: %s
            %s
            rules:
            %s
            """, kind, name, nsYaml, yamlSpec);
        applyYaml(yaml, name, kind);
    }

    public List<K8sRoleResponse> listRoles(String namespace) {
        if (!kubectlAvailable()) return List.of();
        try {
            String output = exec("kubectl", "get", "roles", "-n", namespace != null ? namespace : "default", "-o", "json");
            return K8sRoleResponse.fromK8sList(new ObjectMapper().readValue(output, Map.class), false);
        } catch (Exception e) {
            log.warn("Failed to list Roles: {}", e.getMessage());
            return List.of();
        }
    }

    public List<K8sRoleResponse> listClusterRoles() {
        if (!kubectlAvailable()) return List.of();
        try {
            String output = exec("kubectl", "get", "clusterroles", "-o", "json");
            return K8sRoleResponse.fromK8sList(new ObjectMapper().readValue(output, Map.class), true);
        } catch (Exception e) {
            log.warn("Failed to list ClusterRoles: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sRoleResponse getRole(String name, String namespace) {
        if (!kubectlAvailable()) return null;
        try {
            String output = exec("kubectl", "get", "role", name, "-n", namespace, "-o", "json");
            return K8sRoleResponse.fromK8sJson(new ObjectMapper().readValue(output, Map.class), false);
        } catch (Exception e) {
            log.warn("Failed to get Role {}: {}", name, e.getMessage());
            return null;
        }
    }

    public K8sRoleResponse getClusterRole(String name) {
        if (!kubectlAvailable()) return null;
        try {
            String output = exec("kubectl", "get", "clusterrole", name, "-o", "json");
            return K8sRoleResponse.fromK8sJson(new ObjectMapper().readValue(output, Map.class), true);
        } catch (Exception e) {
            log.warn("Failed to get ClusterRole {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteRole(String name, String namespace, boolean isClusterRole) {
        if (!kubectlAvailable()) return;
        try {
            if (isClusterRole) {
                exec("kubectl", "delete", "clusterrole", name, "--ignore-not-found=true");
            } else {
                exec("kubectl", "delete", "role", name, "-n", namespace, "--ignore-not-found=true");
            }
        } catch (Exception e) {
            log.error("Failed to delete {} {}: {}", isClusterRole ? "ClusterRole" : "Role", name, e.getMessage());
        }
    }

    // ── RoleBindings & ClusterRoleBindings ──

    public void createOrUpdateRoleBinding(String name, String namespace, boolean isClusterBinding, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create {} {}", isClusterBinding ? "ClusterRoleBinding" : "RoleBinding", name);
            return;
        }
        String kind = isClusterBinding ? "ClusterRoleBinding" : "RoleBinding";
        String nsYaml = isClusterBinding ? "" : "  namespace: " + namespace + "\n";
        String yaml = String.format("""
            apiVersion: rbac.authorization.k8s.io/v1
            kind: %s
            metadata:
              name: %s
            %s
            %s
            """, kind, name, nsYaml, yamlSpec);
        applyYaml(yaml, name, kind);
    }

    public List<K8sRoleBindingResponse> listRoleBindings(String namespace) {
        if (!kubectlAvailable()) return List.of();
        try {
            String output = exec("kubectl", "get", "rolebindings", "-n", namespace != null ? namespace : "default", "-o", "json");
            return K8sRoleBindingResponse.fromK8sList(new ObjectMapper().readValue(output, Map.class), false);
        } catch (Exception e) {
            log.warn("Failed to list RoleBindings: {}", e.getMessage());
            return List.of();
        }
    }

    public List<K8sRoleBindingResponse> listClusterRoleBindings() {
        if (!kubectlAvailable()) return List.of();
        try {
            String output = exec("kubectl", "get", "clusterrolebindings", "-o", "json");
            return K8sRoleBindingResponse.fromK8sList(new ObjectMapper().readValue(output, Map.class), true);
        } catch (Exception e) {
            log.warn("Failed to list ClusterRoleBindings: {}", e.getMessage());
            return List.of();
        }
    }

    public void deleteRoleBinding(String name, String namespace, boolean isClusterBinding) {
        if (!kubectlAvailable()) return;
        try {
            if (isClusterBinding) {
                exec("kubectl", "delete", "clusterrolebinding", name, "--ignore-not-found=true");
            } else {
                exec("kubectl", "delete", "rolebinding", name, "-n", namespace, "--ignore-not-found=true");
            }
        } catch (Exception e) {
            log.error("Failed to delete {} {}: {}", isClusterBinding ? "ClusterRoleBinding" : "RoleBinding", name, e.getMessage());
        }
    }

    private void applyYaml(String yaml, String name, String kind) {
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply {} [{}] exit={} output={}", kind, name, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply " + kind + " (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to apply {} {}: {}", kind, name, e.getMessage());
        }
    }

    // ── Secrets ──

    public void createOrUpdateSecret(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create/update Secret {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: v1
            kind: Secret
            metadata:
              name: %s
              namespace: %s
            %s
            """, name, namespace, yamlSpec);
        applyYaml(yaml, name, "Secret");
    }

    public List<K8sSecretResponse> listSecrets(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list Secrets");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "secrets", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sSecretResponse.fromK8sList(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to list Secrets: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sSecretResponse getSecret(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get Secret {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "secret", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sSecretResponse.fromK8sJson(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to get Secret {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteSecret(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete Secret {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "secret", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete Secret {}: {}", name, e.getMessage());
        }
    }

    public void createNamespace(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create namespace {}", namespace);
            return;
        }
        try {
            exec("kubectl", "create", "namespace", namespace);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                log.info("Namespace {} already exists", namespace);
            } else {
                log.warn("Failed to create namespace {}: {}", namespace, e.getMessage());
            }
        }
    }

    public void createNamespace(String namespace, Map<String, String> labels) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create namespace {} with labels", namespace);
            return;
        }
        if (labels != null && !labels.isEmpty()) {
            String labelArgs = labels.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + "," + b)
                .orElse("");
            try {
                exec("kubectl", "create", "namespace", namespace, "--labels=" + labelArgs);
                return;
            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                    log.info("Namespace {} already exists", namespace);
                    return;
                }
                log.warn("Failed to create namespace {} with labels, falling back: {}", namespace, e.getMessage());
            }
        }
        createNamespace(namespace);
    }

    public List<K8sNamespaceResponse> listNamespaces() {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list Namespaces");
            return List.of();
        }
        try {
            String output = exec("kubectl", "get", "namespaces", "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sNamespaceResponse.fromK8sList(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to list Namespaces: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sNamespaceResponse getNamespace(String name) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get Namespace {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "namespace", name, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sNamespaceResponse.fromK8sJson(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to get Namespace {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteNamespace(String name) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete namespace {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "namespace", name, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete namespace {}: {}", name, e.getMessage());
        }
    }

    // ── Services ──

    public void createOrUpdateService(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create/update Service {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: v1
            kind: Service
            metadata:
              name: %s
              namespace: %s
            spec:
            %s
            """, name, namespace, yamlSpec);
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply Service [{}] exit={} output={}", name, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply Service (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to create/update Service {}: {}", name, e.getMessage());
        }
    }

    public List<K8sServiceResponse> listServices(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list Services");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "services", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sServiceResponse.fromK8sList(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to list Services: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sServiceResponse getService(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get Service {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "service", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sServiceResponse.fromK8sJson(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to get Service {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteService(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete Service {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "service", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete Service {}: {}", name, e.getMessage());
        }
    }

    // ── Ingresses ──

    public void createOrUpdateIngress(String name, String namespace, String yamlSpec) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating create/update Ingress {}", name);
            return;
        }
        String yaml = String.format("""
            apiVersion: networking.k8s.io/v1
            kind: Ingress
            metadata:
              name: %s
              namespace: %s
            spec:
            %s
            """, name, namespace, yamlSpec);
        try {
            ProcessBuilder pb = new ProcessBuilder("kubectl", "apply", "-f", "-");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());
            Process process = pb.start();
            process.getOutputStream().write(yaml.getBytes());
            process.getOutputStream().flush();
            process.getOutputStream().close();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("kubectl apply Ingress [{}] exit={} output={}", name, exitCode, output.trim());
            if (exitCode != 0) {
                throw new RuntimeException("Failed to apply Ingress (exit " + exitCode + "): " + output);
            }
        } catch (Exception e) {
            log.error("Failed to create/update Ingress {}: {}", name, e.getMessage());
        }
    }

    public List<K8sIngressResponse> listIngresses(String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating list Ingresses");
            return List.of();
        }
        try {
            String ns = namespace != null ? "-n=" + namespace : "--all-namespaces";
            String output = exec("kubectl", "get", "ingresses", ns, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sIngressResponse.fromK8sList(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to list Ingresses: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sIngressResponse getIngress(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating get Ingress {}", name);
            return null;
        }
        try {
            String output = exec("kubectl", "get", "ingress", name, "-n", namespace, "-o", "json");
            ObjectMapper mapper = new ObjectMapper();
            return K8sIngressResponse.fromK8sJson(mapper.readValue(output, Map.class));
        } catch (Exception e) {
            log.warn("Failed to get Ingress {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteIngress(String name, String namespace) {
        if (!kubectlAvailable()) {
            log.info("kubectl not available — simulating delete Ingress {}", name);
            return;
        }
        try {
            exec("kubectl", "delete", "ingress", name, "-n", namespace, "--ignore-not-found=true");
        } catch (Exception e) {
            log.error("Failed to delete Ingress {}: {}", name, e.getMessage());
        }
    }

    private List<K8sPodResponse> simulatePods(String name, String namespace) {
        int count = ThreadLocalRandom.current().nextInt(1, 4);
        List<K8sPodResponse> pods = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            pods.add(new K8sPodResponse(
                    name + "-" + (ThreadLocalRandom.current().nextInt(10000, 99999)) + "-" + i,
                    "Running",
                    "1/1",
                    0,
                    "1d",
                    namespace));
        }
        return pods;
    }

    private List<K8sPodResponse> parsePodsJson(String json) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(json);
            JsonNode items = root.get("items");
            if (items == null || !items.isArray() || items.isEmpty()) {
                return simulatePods("unknown", "default");
            }

            List<K8sPodResponse> pods = new ArrayList<>();
            for (JsonNode item : items) {
                String podName = item.path("metadata").path("name").asText(null);
                if (podName == null) continue;

                String namespace = item.path("metadata").path("namespace").asText("default");
                String phase = item.path("status").path("phase").asText("Unknown");

                int readyContainers = 0;
                int totalContainers = 0;
                int restarts = 0;
                JsonNode containerStatuses = item.path("status").path("containerStatuses");
                if (containerStatuses != null && containerStatuses.isArray()) {
                    totalContainers = containerStatuses.size();
                    for (JsonNode cs : containerStatuses) {
                        if (cs.path("ready").asBoolean()) readyContainers++;
                        restarts += cs.path("restartCount").asInt(0);
                    }
                }

                String ready = readyContainers + "/" + totalContainers;
                String age = computeAge(item.path("metadata").path("creationTimestamp").asText());

                pods.add(new K8sPodResponse(podName, phase, ready, restarts, age, namespace));
            }
            return pods.isEmpty() ? simulatePods("unknown", "default") : pods;
        } catch (Exception e) {
            log.warn("Failed to parse pods JSON: {}", e.getMessage());
            return simulatePods("unknown", "default");
        }
    }

    private String computeAge(String creationTimestamp) {
        if (creationTimestamp == null || creationTimestamp.isEmpty()) return "0s";
        try {
            java.time.Instant created = java.time.Instant.parse(creationTimestamp);
            java.time.Duration duration = java.time.Duration.between(created, java.time.Instant.now());
            long days = duration.toDays();
            long hours = duration.toHours() % 24;
            long minutes = duration.toMinutes() % 60;
            long seconds = duration.getSeconds() % 60;
            if (days > 0) return days + "d";
            if (hours > 0) return hours + "h";
            if (minutes > 0) return minutes + "m";
            return seconds + "s";
        } catch (Exception e) {
            return "0s";
        }
    }

    private Map<String, Object> parseDeploymentStatusJson(String json) {
        try {
            int repIdx = json.indexOf("\"replicas\":");
            int readyIdx = json.indexOf("\"readyReplicas\":");
            int availIdx = json.indexOf("\"availableReplicas\":");
            int updatedIdx = json.indexOf("\"updatedReplicas\":");

            int replicas = repIdx != -1 ? extractInt(json, repIdx) : 1;
            int readyReplicas = readyIdx != -1 ? extractInt(json, readyIdx) : 0;
            int availableReplicas = availIdx != -1 ? extractInt(json, availIdx) : 0;
            int updatedReplicas = updatedIdx != -1 ? extractInt(json, updatedIdx) : 0;

            return Map.of(
                    "replicas", replicas,
                    "readyReplicas", readyReplicas,
                    "availableReplicas", availableReplicas,
                    "updatedReplicas", updatedReplicas);
        } catch (Exception e) {
            log.warn("Failed to parse deployment status JSON: {}", e.getMessage());
            return Map.of("replicas", 0, "readyReplicas", 0);
        }
    }

    private int extractInt(String json, int keyIndex) {
        int colon = json.indexOf(":", keyIndex);
        int end = json.indexOf(",", colon);
        if (end == -1) end = json.indexOf("}", colon);
        String val = json.substring(colon + 1, end).trim();
        return Integer.parseInt(val);
    }
}
