package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNamespaceRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNamespaceResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;
import com.deployment.ServiceEntity.config.UserContext;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sNamespace.BASE)
@RequiredArgsConstructor
public class K8sNamespaceController {

    private final KubernetesClient kubernetesClient;

    @GetMapping
    public ResponseEntity<Page<K8sNamespaceResponse>> list(
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sNamespaceResponse> all = kubernetesClient.listNamespaces();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sNamespaceResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sNamespaceResponse> get(@PathVariable String name) {
        UserContext.requirePermission("K8S_READ");
        K8sNamespaceResponse ns = kubernetesClient.getNamespace(name);
        if (ns == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(ns);
    }

    @PostMapping
    public ResponseEntity<K8sNamespaceResponse> create(@Valid @RequestBody K8sNamespaceRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.createNamespace(dto.name(), dto.labels());
        K8sNamespaceResponse result = kubernetesClient.getNamespace(dto.name());
        if (result == null) {
            result = K8sNamespaceResponse.fromSimulated(dto.name());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteNamespace(name);
        return ResponseEntity.noContent().build();
    }
}