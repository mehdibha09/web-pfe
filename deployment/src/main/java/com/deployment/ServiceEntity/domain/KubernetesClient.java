package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import io.fabric8.kubernetes.api.model.ConfigMap;
import io.fabric8.kubernetes.api.model.Namespace;
import io.fabric8.kubernetes.api.model.NamespaceBuilder;
import io.fabric8.kubernetes.api.model.Pod;
import io.fabric8.kubernetes.api.model.Secret;
import io.fabric8.kubernetes.api.model.Service;
import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.apps.DeploymentBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.HorizontalPodAutoscaler;
import io.fabric8.kubernetes.api.model.autoscaling.v2.HorizontalPodAutoscalerBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.MetricSpecBuilder;
import io.fabric8.kubernetes.api.model.autoscaling.v2.ResourceMetricSourceBuilder;
import io.fabric8.kubernetes.api.model.networking.v1.Ingress;
import io.fabric8.kubernetes.api.model.networking.v1.NetworkPolicy;
import io.fabric8.kubernetes.api.model.rbac.ClusterRole;
import io.fabric8.kubernetes.api.model.rbac.ClusterRoleBinding;
import io.fabric8.kubernetes.api.model.rbac.Role;
import io.fabric8.kubernetes.api.model.rbac.RoleBinding;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;

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

    private io.fabric8.kubernetes.client.KubernetesClient client;

    private synchronized io.fabric8.kubernetes.client.KubernetesClient client() {
        if (client == null) {
            client = new KubernetesClientBuilder().build();
        }
        return client;
    }

    private boolean available() {
        try {
            client();
            return true;
        } catch (Exception e) {
            log.debug("Kubernetes client unavailable, using simulation: {}", e.getMessage());
            return false;
        }
    }

    public void createDeployment(K8sDeployment deployment) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create deployment {}", deployment.getName());
            return;
        }
        try {
            Deployment d = new DeploymentBuilder()
                    .withNewMetadata().withName(deployment.getName()).withNamespace(deployment.getNamespace())
                    .addToLabels("app", deployment.getName())
                    .endMetadata()
                    .withNewSpec()
                    .withReplicas(deployment.getReplicas())
                    .withNewSelector().addToMatchLabels("app", deployment.getName()).endSelector()
                    .withNewTemplate()
                    .withNewMetadata().addToLabels("app", deployment.getName()).endMetadata()
                    .withNewSpec()
                    .addNewContainer()
                    .withName(deployment.getName())
                    .withImage(deployment.getDockerImage())
                    .addNewPort().withContainerPort(deployment.getPort()).endPort()
                    .endContainer()
                    .endSpec()
                    .endTemplate()
                    .endSpec()
                    .build();
            client().apps().deployments().inNamespace(deployment.getNamespace()).resource(d).create();
        } catch (Exception e) {
            log.error("Failed to create deployment {}: {}", deployment.getName(), e.getMessage());
        }
    }

    public void scaleDeployment(String name, int replicas, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating scale {} to {} replicas", name, replicas);
            return;
        }
        try {
            client().apps().deployments().inNamespace(namespace).withName(name).scale(replicas);
        } catch (Exception e) {
            log.error("Failed to scale deployment {}: {}", name, e.getMessage());
        }
    }

    public void restartDeployment(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating restart deployment {}", name);
            return;
        }
        try {
            Deployment d = client().apps().deployments().inNamespace(namespace).withName(name).get();
            if (d == null) return;
            Map<String, String> annotations = new LinkedHashMap<>(d.getMetadata().getAnnotations() == null
                    ? Map.of() : d.getMetadata().getAnnotations());
            annotations.put("deployment.kubernetes.io/restartedAt", Instant.now().toString());
            client().apps().deployments().inNamespace(namespace).withName(name)
                    .edit(dep -> new DeploymentBuilder(dep)
                            .editMetadata().addToAnnotations(annotations).endMetadata().build());
        } catch (Exception e) {
            log.error("Failed to restart deployment {}: {}", name, e.getMessage());
        }
    }

    public void rollbackDeployment(String name, String namespace, Integer revision) {
        if (!available()) {
            log.info("Kubernetes not available — simulating rollback deployment {}", name);
            return;
        }
        try {
            Deployment d = client().apps().deployments().inNamespace(namespace).withName(name).get();
            if (d == null) return;
            if (revision != null) {
                Map<String, String> annotations = new LinkedHashMap<>(d.getMetadata().getAnnotations() == null
                        ? Map.of() : d.getMetadata().getAnnotations());
                annotations.put("deployment.kubernetes.io/revision", String.valueOf(revision));
                client().apps().deployments().inNamespace(namespace).withName(name)
                        .edit(dep -> new DeploymentBuilder(dep)
                                .editMetadata().addToAnnotations(annotations).endMetadata().build());
            } else {
                Map<String, String> annotations = new LinkedHashMap<>(d.getMetadata().getAnnotations() == null
                        ? Map.of() : d.getMetadata().getAnnotations());
                annotations.remove("deployment.kubernetes.io/revision");
                client().apps().deployments().inNamespace(namespace).withName(name)
                        .edit(dep -> new DeploymentBuilder(dep)
                                .editMetadata().addToAnnotations(annotations).endMetadata().build());
            }
        } catch (Exception e) {
            log.error("Failed to rollback deployment {}: {}", name, e.getMessage());
        }
    }

    public void deleteDeployment(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete deployment {}", name);
            return;
        }
        try {
            client().apps().deployments().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete deployment {}: {}", name, e.getMessage());
        }
    }

    public List<K8sPodResponse> getPods(String name, String namespace) {
        if (!available()) {
            return simulatePods(name, namespace);
        }
        try {
            List<Pod> pods = client().pods().inNamespace(namespace).withLabel("app", name).list().getItems();
            if (pods.isEmpty()) return simulatePods(name, namespace);
            List<K8sPodResponse> result = new ArrayList<>();
            for (Pod p : pods) {
                String podName = p.getMetadata().getName();
                String phase = p.getStatus() != null && p.getStatus().getPhase() != null
                        ? p.getStatus().getPhase() : "Unknown";
                int readyContainers = 0;
                int totalContainers = 0;
                int restarts = 0;
                if (p.getStatus() != null && p.getStatus().getContainerStatuses() != null) {
                    totalContainers = p.getStatus().getContainerStatuses().size();
                    for (var cs : p.getStatus().getContainerStatuses()) {
                        if (Boolean.TRUE.equals(cs.getReady())) readyContainers++;
                        if (cs.getRestartCount() != null) restarts += cs.getRestartCount();
                    }
                }
                String ns = p.getMetadata().getNamespace();
                String age = computeAge(p.getMetadata().getCreationTimestamp());
                result.add(new K8sPodResponse(podName, phase, readyContainers + "/" + totalContainers, restarts, age, ns));
            }
            return result.isEmpty() ? simulatePods(name, namespace) : result;
        } catch (Exception e) {
            log.warn("Failed to get pods, returning simulated data: {}", e.getMessage());
            return simulatePods(name, namespace);
        }
    }

    public String getLogs(String name, String namespace) {
        if (!available()) {
            return "[simulated] Logs for deployment " + name + " in namespace " + namespace
                    + "\nNo real Kubernetes available. Here are placeholder logs:\n"
                    + "2024-01-01T00:00:00Z Application started\n"
                    + "2024-01-01T00:00:01Z Listening on port 8080\n"
                    + "2024-01-01T00:00:02Z Ready to serve requests";
        }
        try {
            List<Pod> pods = client().pods().inNamespace(namespace).withLabel("app", name).list().getItems();
            if (pods.isEmpty()) return "No pods found for deployment " + name;
            String podName = pods.get(0).getMetadata().getName();
            return client().pods().inNamespace(namespace).withName(podName).getLog();
        } catch (Exception e) {
            log.error("Failed to get logs for {}: {}", name, e.getMessage());
            return "Error retrieving logs: " + e.getMessage();
        }
    }

    public Map<String, Object> getStatus(String name, String namespace) {
        if (!available()) {
            return Map.of(
                    "name", name,
                    "namespace", namespace,
                    "availableReplicas", 1,
                    "readyReplicas", 1,
                    "status", "Available");
        }
        try {
            Deployment d = client().apps().deployments().inNamespace(namespace).withName(name).get();
            if (d == null || d.getStatus() == null) {
                return Map.of("name", name, "namespace", namespace, "availableReplicas", 0, "readyReplicas", 0);
            }
            return Map.of(
                    "name", name,
                    "namespace", namespace,
                    "replicas", nonNull(d.getStatus().getReplicas()),
                    "readyReplicas", nonNull(d.getStatus().getReadyReplicas()),
                    "availableReplicas", nonNull(d.getStatus().getAvailableReplicas()),
                    "updatedReplicas", nonNull(d.getStatus().getUpdatedReplicas()),
                    "status", "Available");
        } catch (Exception e) {
            log.error("Failed to get status for {}: {}", name, e.getMessage());
            return Map.of("name", name, "namespace", namespace, "error", e.getMessage());
        }
    }

    public String getEvents(String name, String namespace) {
        if (!available()) {
            return "[simulated] Events for deployment " + name + " in namespace " + namespace
                    + "\nNo real Kubernetes available. Placeholder events:\n"
                    + "Normal  Scheduled  default-scheduler  Successfully assigned";
        }
        try {
            var events = client().v1().events().inNamespace(namespace).list().getItems();
            StringBuilder sb = new StringBuilder();
            for (var e : events) {
                if (e.getInvolvedObject() != null && name.equals(e.getInvolvedObject().getName())) {
                    sb.append(e.getLastTimestamp()).append("  ")
                      .append(e.getType() == null ? "Normal" : e.getType()).append("  ")
                      .append(e.getReason() == null ? "" : e.getReason()).append("  ")
                      .append(e.getMessage() == null ? "" : e.getMessage()).append("\n");
                }
            }
            return sb.length() == 0 ? "No events found for " + name : sb.toString();
        } catch (Exception e) {
            log.error("Failed to get events for {}: {}", name, e.getMessage());
            return "Error retrieving events: " + e.getMessage();
        }
    }

    private int nonNull(Integer v) {
        return v != null ? v : 0;
    }

    public void createOrUpdateHpa(String name, String namespace, int minReplicas, int maxReplicas, int cpuTarget, int memoryTarget) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create HPA for {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        String hpaName = name + "-hpa";
        try {
            HorizontalPodAutoscaler hpa = new HorizontalPodAutoscalerBuilder()
                    .withNewMetadata().withName(hpaName).withNamespace(namespace).endMetadata()
                    .withNewSpec()
                    .withMinReplicas(minReplicas)
                    .withMaxReplicas(maxReplicas)
                    .withNewScaleTargetRef().withApiVersion("apps/v1").withKind("Deployment").withName(name).endScaleTargetRef()
                    .withMetrics(
                            new MetricSpecBuilder().withType("Resource")
                                    .withResource(new ResourceMetricSourceBuilder()
                                            .withName("cpu")
                                            .withNewTarget().withType("Utilization").withAverageUtilization(cpuTarget).endTarget()
                                            .build()).build(),
                            new MetricSpecBuilder().withType("Resource")
                                    .withResource(new ResourceMetricSourceBuilder()
                                            .withName("memory")
                                            .withNewTarget().withType("Utilization").withAverageUtilization(memoryTarget).endTarget()
                                            .build()).build())
                    .endSpec()
                    .build();
            client().autoscaling().v2().horizontalPodAutoscalers().inNamespace(namespace).resource(hpa).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update HPA for {}: {}", name, e.getMessage());
        }
    }

    public io.fabric8.kubernetes.api.model.autoscaling.v2.HorizontalPodAutoscaler getHpaObject(String name, String namespace) {
        try {
            return client().autoscaling().v2().horizontalPodAutoscalers()
                    .inNamespace(namespace).withName(name + "-hpa").get();
        } catch (Exception e) {
            log.warn("Failed to get HPA for {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteHpa(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete HPA for {}", name);
            return;
        }
        try {
            client().autoscaling().v2().horizontalPodAutoscalers().inNamespace(namespace).withName(name + "-hpa").delete();
        } catch (Exception e) {
            log.error("Failed to delete HPA for {}: {}", name, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asJsonMap(Object obj) {
        if (obj == null) return null;
        try {
            stripManagedFields(obj);
            String json = client().getKubernetesSerialization().asJson(obj);
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            log.warn("Failed to serialize Kubernetes object: {}", e.getMessage(), e);
            return null;
        }
    }

    private void stripManagedFields(Object obj) {
        try {
            if (obj instanceof io.fabric8.kubernetes.api.model.HasMetadata meta) {
                if (meta.getMetadata() != null) {
                    meta.getMetadata().setManagedFields(null);
                }
            } else if (obj instanceof io.fabric8.kubernetes.api.model.KubernetesResourceList list) {
                for (Object item : list.getItems()) {
                    if (item instanceof io.fabric8.kubernetes.api.model.HasMetadata meta
                        && meta.getMetadata() != null) {
                        meta.getMetadata().setManagedFields(null);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("stripManagedFields skipped: {}", e.getMessage());
        }
    }

    private Map<String, Object> hpaToJson(HorizontalPodAutoscaler hpa, String name, String namespace) {
        Map<String, Object> json = asJsonMap(hpa);
        if (json == null) return Map.of("name", name, "namespace", namespace);
        return json;
    }

    public K8sHpaResponse getHpa(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating get HPA for {}", name);
            return null;
        }
        try {
            HorizontalPodAutoscaler hpa = client().autoscaling().v2().horizontalPodAutoscalers()
                    .inNamespace(namespace).withName(name + "-hpa").get();
            if (hpa == null) return null;
            return K8sHpaResponse.fromK8sJson(hpaToJson(hpa, name, namespace));
        } catch (Exception e) {
            log.warn("Failed to get HPA for {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void createOrUpdateNetworkPolicy(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create NetworkPolicy {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String full = String.format("""
                apiVersion: networking.k8s.io/v1
                kind: NetworkPolicy
                metadata:
                  name: %s
                  namespace: %s
                spec:
                  %s
                """, name, namespace, yamlSpec);
            NetworkPolicy np = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(full, NetworkPolicy.class);
            client().network().v1().networkPolicies().inNamespace(namespace).resource(np).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update NetworkPolicy {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateConfigMap(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create/update ConfigMap {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String yaml = String.format("""
                apiVersion: v1
                kind: ConfigMap
                metadata:
                  name: %s
                  namespace: %s
                %s
                """, name, namespace, yamlSpec);
            ConfigMap cm = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, ConfigMap.class);
            client().configMaps().inNamespace(namespace).resource(cm).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update ConfigMap {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateSecret(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create/update Secret {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String yaml = String.format("""
                apiVersion: v1
                kind: Secret
                metadata:
                  name: %s
                  namespace: %s
                %s
                """, name, namespace, yamlSpec);
            Secret s = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, Secret.class);
            client().secrets().inNamespace(namespace).resource(s).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update Secret {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateService(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create/update Service {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String yaml = String.format("""
                apiVersion: v1
                kind: Service
                metadata:
                  name: %s
                  namespace: %s
                spec:
                %s
                """, name, namespace, yamlSpec);
            Service s = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, Service.class);
            client().services().inNamespace(namespace).resource(s).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update Service {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateIngress(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create/update Ingress {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String yaml = String.format("""
                apiVersion: networking.k8s.io/v1
                kind: Ingress
                metadata:
                  name: %s
                  namespace: %s
                spec:
                %s
                """, name, namespace, yamlSpec);
            Ingress ing = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, Ingress.class);
            client().network().v1().ingresses().inNamespace(namespace).resource(ing).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update Ingress {}: {}", name, e.getMessage());
        }
    }

    public List<K8sNetworkPolicyResponse> listNetworkPolicies(String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating list NetworkPolicies");
            return List.of();
        }
        try {
            var list = namespace != null && !namespace.isBlank()
                    ? client().network().v1().networkPolicies().inNamespace(namespace).list()
                    : client().network().v1().networkPolicies().inAnyNamespace().list();
            Map<String, Object> json = asJsonMap(list);
            return K8sNetworkPolicyResponse.fromK8sList(json);
        } catch (Exception e) {
            log.warn("Failed to list NetworkPolicies: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sNetworkPolicyResponse getNetworkPolicy(String name, String namespace) {
        if (!available()) return null;
        try {
            NetworkPolicy np = client().network().v1().networkPolicies().inNamespace(namespace).withName(name).get();
            return np == null ? null : K8sNetworkPolicyResponse.fromK8sJson(asJsonMap(np));
        } catch (Exception e) {
            log.warn("Failed to get NetworkPolicy {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteNetworkPolicy(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete NetworkPolicy {}", name);
            return;
        }
        try {
            client().network().v1().networkPolicies().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete NetworkPolicy {}: {}", name, e.getMessage());
        }
    }

    public List<K8sConfigMapResponse> listConfigMaps(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().configMaps().inAnyNamespace().list()
                    : client().configMaps().inNamespace(namespace).list();
            return K8sConfigMapResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list ConfigMaps: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sConfigMapResponse getConfigMap(String name, String namespace) {
        if (!available()) return null;
        try {
            ConfigMap cm = client().configMaps().inNamespace(namespace).withName(name).get();
            return cm == null ? null : K8sConfigMapResponse.fromK8sJson(asJsonMap(cm));
        } catch (Exception e) {
            log.warn("Failed to get ConfigMap {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteConfigMap(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete ConfigMap {}", name);
            return;
        }
        try {
            client().configMaps().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete ConfigMap {}: {}", name, e.getMessage());
        }
    }

    public List<K8sSecretResponse> listSecrets(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().secrets().inAnyNamespace().list()
                    : client().secrets().inNamespace(namespace).list();
            return K8sSecretResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list Secrets: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sSecretResponse getSecret(String name, String namespace) {
        if (!available()) return null;
        try {
            Secret s = client().secrets().inNamespace(namespace).withName(name).get();
            return s == null ? null : K8sSecretResponse.fromK8sJson(asJsonMap(s));
        } catch (Exception e) {
            log.warn("Failed to get Secret {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteSecret(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete Secret {}", name);
            return;
        }
        try {
            client().secrets().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete Secret {}: {}", name, e.getMessage());
        }
    }

    public void createNamespace(String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create namespace {}", namespace);
            return;
        }
        try {
            Namespace ns = client().namespaces().withName(namespace).get();
            if (ns != null) {
                log.info("Namespace {} already exists", namespace);
                return;
            }
            client().namespaces().resource(new NamespaceBuilder().withNewMetadata().withName(namespace).endMetadata().build()).create();
        } catch (Exception e) {
            log.warn("Failed to create namespace {}: {}", namespace, e.getMessage());
        }
    }

    public void createNamespace(String namespace, Map<String, String> labels) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create namespace {} with labels", namespace);
            return;
        }
        try {
            Namespace ns = client().namespaces().withName(namespace).get();
            if (ns != null) {
                log.info("Namespace {} already exists", namespace);
                return;
            }
            Namespace nsToCreate;
            if (labels != null && !labels.isEmpty()) {
                nsToCreate = new NamespaceBuilder()
                        .withNewMetadata().withName(namespace).addToLabels(labels).endMetadata()
                        .build();
            } else {
                nsToCreate = new NamespaceBuilder().withNewMetadata().withName(namespace).endMetadata().build();
            }
            client().namespaces().resource(nsToCreate).create();
        } catch (Exception e) {
            log.warn("Failed to create namespace {} with labels: {}", namespace, e.getMessage());
            createNamespace(namespace);
        }
    }

    public List<K8sNamespaceResponse> listNamespaces() {
        if (!available()) return List.of();
        try {
            var list = client().namespaces().list();
            return K8sNamespaceResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list Namespaces: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sNamespaceResponse getNamespace(String name) {
        if (!available()) return null;
        try {
            Namespace ns = client().namespaces().withName(name).get();
            return ns == null ? null : K8sNamespaceResponse.fromK8sJson(asJsonMap(ns));
        } catch (Exception e) {
            log.warn("Failed to get Namespace {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteNamespace(String name) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete namespace {}", name);
            return;
        }
        try {
            client().namespaces().withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete namespace {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateServiceAccount(String name, String namespace, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create ServiceAccount {}", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
        }
        try {
            String yaml = String.format("""
                apiVersion: v1
                kind: ServiceAccount
                metadata:
                  name: %s
                  namespace: %s
                %s
                """, name, namespace, yamlSpec);
            io.fabric8.kubernetes.api.model.ServiceAccount sa =
                    io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, io.fabric8.kubernetes.api.model.ServiceAccount.class);
            client().serviceAccounts().inNamespace(namespace).resource(sa).createOrReplace();
        } catch (Exception e) {
            log.error("Failed to create/update ServiceAccount {}: {}", name, e.getMessage());
        }
    }

    public List<K8sServiceAccountResponse> listServiceAccounts(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().serviceAccounts().inAnyNamespace().list()
                    : client().serviceAccounts().inNamespace(namespace).list();
            return K8sServiceAccountResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list ServiceAccounts: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sServiceAccountResponse getServiceAccount(String name, String namespace) {
        if (!available()) return null;
        try {
            var sa = client().serviceAccounts().inNamespace(namespace).withName(name).get();
            return sa == null ? null : K8sServiceAccountResponse.fromK8sJson(asJsonMap(sa));
        } catch (Exception e) {
            log.warn("Failed to get ServiceAccount {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteServiceAccount(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete ServiceAccount {}", name);
            return;
        }
        try {
            client().serviceAccounts().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete ServiceAccount {}: {}", name, e.getMessage());
        }
    }

    public void createOrUpdateRole(String name, String namespace, boolean isClusterRole, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create {} {}", isClusterRole ? "ClusterRole" : "Role", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
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
        try {
            if (isClusterRole) {
                ClusterRole cr = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, ClusterRole.class);
                client().rbac().clusterRoles().resource(cr).createOrReplace();
            } else {
                Role r = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, Role.class);
                client().rbac().roles().inNamespace(namespace).resource(r).createOrReplace();
            }
        } catch (Exception e) {
            log.error("Failed to apply {} {}: {}", kind, name, e.getMessage());
        }
    }

    public List<K8sRoleResponse> listRoles(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().rbac().roles().inAnyNamespace().list()
                    : client().rbac().roles().inNamespace(namespace).list();
            return K8sRoleResponse.fromK8sList(asJsonMap(list), false);
        } catch (Exception e) {
            log.warn("Failed to list Roles: {}", e.getMessage());
            return List.of();
        }
    }

    public List<K8sRoleResponse> listClusterRoles() {
        if (!available()) return List.of();
        try {
            var list = client().rbac().clusterRoles().list();
            return K8sRoleResponse.fromK8sList(asJsonMap(list), true);
        } catch (Exception e) {
            log.warn("Failed to list ClusterRoles: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sRoleResponse getRole(String name, String namespace) {
        if (!available()) return null;
        try {
            Role r = client().rbac().roles().inNamespace(namespace).withName(name).get();
            return r == null ? null : K8sRoleResponse.fromK8sJson(asJsonMap(r), false);
        } catch (Exception e) {
            log.warn("Failed to get Role {}: {}", name, e.getMessage());
            return null;
        }
    }

    public K8sRoleResponse getClusterRole(String name) {
        if (!available()) return null;
        try {
            ClusterRole cr = client().rbac().clusterRoles().withName(name).get();
            return cr == null ? null : K8sRoleResponse.fromK8sJson(asJsonMap(cr), true);
        } catch (Exception e) {
            log.warn("Failed to get ClusterRole {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteRole(String name, String namespace, boolean isClusterRole) {
        if (!available()) return;
        try {
            if (isClusterRole) {
                client().rbac().clusterRoles().withName(name).delete();
            } else {
                client().rbac().roles().inNamespace(namespace).withName(name).delete();
            }
        } catch (Exception e) {
            log.error("Failed to delete {} {}: {}", isClusterRole ? "ClusterRole" : "Role", name, e.getMessage());
        }
    }

    public void createOrUpdateRoleBinding(String name, String namespace, boolean isClusterBinding, String yamlSpec) {
        if (!available()) {
            log.info("Kubernetes not available — simulating create {} {}", isClusterBinding ? "ClusterRoleBinding" : "RoleBinding", name);
            return;
        }
        if (namespace != null && !namespace.isBlank()) {
            createNamespace(namespace);
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
        try {
            if (isClusterBinding) {
                ClusterRoleBinding crb = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, ClusterRoleBinding.class);
                client().rbac().clusterRoleBindings().resource(crb).createOrReplace();
            } else {
                RoleBinding rb = io.fabric8.kubernetes.client.utils.Serialization.unmarshal(yaml, RoleBinding.class);
                client().rbac().roleBindings().inNamespace(namespace).resource(rb).createOrReplace();
            }
        } catch (Exception e) {
            log.error("Failed to apply {} {}: {}", kind, name, e.getMessage());
        }
    }

    public List<K8sRoleBindingResponse> listRoleBindings(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().rbac().roleBindings().inAnyNamespace().list()
                    : client().rbac().roleBindings().inNamespace(namespace).list();
            return K8sRoleBindingResponse.fromK8sList(asJsonMap(list), false);
        } catch (Exception e) {
            log.warn("Failed to list RoleBindings: {}", e.getMessage());
            return List.of();
        }
    }

    public List<K8sRoleBindingResponse> listClusterRoleBindings() {
        if (!available()) return List.of();
        try {
            var list = client().rbac().clusterRoleBindings().list();
            return K8sRoleBindingResponse.fromK8sList(asJsonMap(list), true);
        } catch (Exception e) {
            log.warn("Failed to list ClusterRoleBindings: {}", e.getMessage());
            return List.of();
        }
    }

    public void deleteRoleBinding(String name, String namespace, boolean isClusterBinding) {
        if (!available()) return;
        try {
            if (isClusterBinding) {
                client().rbac().clusterRoleBindings().withName(name).delete();
            } else {
                client().rbac().roleBindings().inNamespace(namespace).withName(name).delete();
            }
        } catch (Exception e) {
            log.error("Failed to delete {} {}: {}", isClusterBinding ? "ClusterRoleBinding" : "RoleBinding", name, e.getMessage());
        }
    }

    public List<K8sServiceResponse> listServices(String namespace) {
        if (!available()) return List.of();
        try {
            var list = namespace == null || namespace.isBlank()
                    ? client().services().inAnyNamespace().list()
                    : client().services().inNamespace(namespace).list();
            return K8sServiceResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list Services: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sServiceResponse getService(String name, String namespace) {
        if (!available()) return null;
        try {
            Service s = client().services().inNamespace(namespace).withName(name).get();
            return s == null ? null : K8sServiceResponse.fromK8sJson(asJsonMap(s));
        } catch (Exception e) {
            log.warn("Failed to get Service {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteService(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete Service {}", name);
            return;
        }
        try {
            client().services().inNamespace(namespace).withName(name).delete();
        } catch (Exception e) {
            log.error("Failed to delete Service {}: {}", name, e.getMessage());
        }
    }

public List<K8sIngressResponse> listIngresses(String namespace) {
        if (!available()) return List.of();
        try {
            var list = client().network().v1().ingresses().inAnyNamespace().list();
            return K8sIngressResponse.fromK8sList(asJsonMap(list));
        } catch (Exception e) {
            log.warn("Failed to list Ingresses: {}", e.getMessage());
            return List.of();
        }
    }

    public K8sIngressResponse getIngress(String name, String namespace) {
        if (!available()) return null;
        try {
            Ingress ing = client().network().v1().ingresses().inNamespace(namespace).withName(name).get();
            return ing == null ? null : K8sIngressResponse.fromK8sJson(asJsonMap(ing));
        } catch (Exception e) {
            log.warn("Failed to get Ingress {}: {}", name, e.getMessage());
            return null;
        }
    }

    public void deleteIngress(String name, String namespace) {
        if (!available()) {
            log.info("Kubernetes not available — simulating delete Ingress {}", name);
            return;
        }
        try {
            client().network().v1().ingresses().inNamespace(namespace).withName(name).delete();
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

    private String computeAge(String created) {
        if (created == null || created.isEmpty()) return "0s";
        try {
            String normalized = created.endsWith("Z") ? created : created + "Z";
            if (normalized.indexOf('.') < 0) {
                normalized = normalized.substring(0, normalized.length() - 1) + ".000Z";
            } else {
                int dot = normalized.indexOf('.');
                int z = normalized.indexOf('Z');
                normalized = normalized.substring(0, dot) + ".000" + normalized.substring(z);
            }
            java.time.Instant createdInstant = java.time.Instant.parse(normalized);
            java.time.Duration duration = java.time.Duration.between(createdInstant, java.time.Instant.now());
            long days = duration.toDays();
            long hours = duration.toHours() % 24;
            long minutes = duration.toMinutes() % 60;
            if (days > 0) return days + "d";
            if (hours > 0) return hours + "h";
            if (minutes > 0) return minutes + "m";
            return duration.getSeconds() + "s";
        } catch (Exception e) {
            return "0s";
        }
    }
}
