package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import jakarta.validation.constraints.NotBlank;

public record K8sNetworkPolicyRequest(
    @NotBlank String name,
    String namespace,
    String podSelectorLabels,
    List<String> policyTypes,
    List<NetworkPolicyRule> ingressRules,
    List<NetworkPolicyRule> egressRules) {

    public record NetworkPolicyRule(
        List<String> ipBlocks,
        List<String> namespaceSelectorLabels,
        List<String> podSelectorLabels,
        List<String> ports) {}
}
