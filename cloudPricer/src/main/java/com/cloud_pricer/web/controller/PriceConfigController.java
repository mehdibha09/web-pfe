package com.cloud_pricer.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.PriceConfig;
import com.cloud_pricer.service.PriceConfigService;
import com.cloud_pricer.web.dto.pricing.CalculateCostResponse;
import com.cloud_pricer.web.dto.pricing.PriceConfigRequest;
import com.cloud_pricer.web.dto.pricing.PriceConfigResponse;
import com.cloud_pricer.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Pricing.BASE)
@RequiredArgsConstructor
public class PriceConfigController {

    private final PriceConfigService priceConfigService;

    @GetMapping
    public ResponseEntity<Page<PriceConfigResponse>> getAll(
            @RequestParam(name = "mode", required = false) String mode,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("PRICE_CONFIG_READ");
        return ResponseEntity.ok(priceConfigService.getAll(mode, pageable).map(this::map));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PriceConfigResponse> getById(@PathVariable UUID id) {
        UserContext.requirePermission("PRICE_CONFIG_READ");
        return ResponseEntity.ok(map(priceConfigService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<PriceConfigResponse> create(@Valid @RequestBody PriceConfigRequest dto) {
        UserContext.requirePermission("PRICE_CONFIG_MANAGE");
        PriceConfig config = new PriceConfig();
        config.setMode(dto.mode());
        config.setResourceType(dto.resourceType());
        config.setPricePerUnit(dto.pricePerUnit());
        config.setUnit(dto.unit());
        config.setCurrency(dto.currency());
        config.setActive(dto.isActive());

        PriceConfig created = priceConfigService.create(config);
        return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PriceConfigResponse> update(@PathVariable UUID id,
            @Valid @RequestBody PriceConfigRequest dto) {
        UserContext.requirePermission("PRICE_CONFIG_MANAGE");
        PriceConfig config = new PriceConfig();
        config.setMode(dto.mode());
        config.setResourceType(dto.resourceType());
        config.setPricePerUnit(dto.pricePerUnit());
        config.setUnit(dto.unit());
        config.setCurrency(dto.currency());
        config.setActive(dto.isActive());

        return ResponseEntity.ok(map(priceConfigService.update(id, config)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("PRICE_CONFIG_MANAGE");
        priceConfigService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/calculate")
    public ResponseEntity<CalculateCostResponse> calculate(
            @RequestParam(name = "mode") String mode,
            @RequestParam(name = "cpu", defaultValue = "0") double cpu,
            @RequestParam(name = "ram", defaultValue = "0") double ram,
            @RequestParam(name = "disk", defaultValue = "0") double disk,
            @RequestParam(name = "network_usage", defaultValue = "0") double networkUsage,
            @RequestParam(name = "backup_size", defaultValue = "0") double backupSize,
            @RequestParam(name = "hours", defaultValue = "720") double hours) {
        UserContext.requirePermission("PRICE_CONFIG_READ");
        List<PriceConfig> configs = priceConfigService.getAllByModeForSystem(mode);

        double computeCost = 0;
        double storageCost = 0;
        double networkCost = 0;
        double backupCost = 0;
        double osCost = 0;

        for (PriceConfig cfg : configs) {
            if (!cfg.isActive())
                continue;
            switch (cfg.getResourceType()) {
                case "CPU":
                    computeCost += cpu * cfg.getPricePerUnit() * hours;
                    break;
                case "RAM":
                    computeCost += ram * cfg.getPricePerUnit() * hours;
                    break;
                case "DISK":
                    storageCost += disk * cfg.getPricePerUnit();
                    break;
                case "NETWORK":
                    networkCost += networkUsage * cfg.getPricePerUnit();
                    break;
                case "BACKUP":
                    backupCost += backupSize * cfg.getPricePerUnit();
                    break;
                case "OS":
                    osCost += cfg.getPricePerUnit();
                    break;
                default:
                    break;
            }
        }

        double totalCost = computeCost + storageCost + networkCost + backupCost + osCost;

        return ResponseEntity.ok(new CalculateCostResponse(
                computeCost, storageCost, networkCost, backupCost, osCost, totalCost));
    }

    private PriceConfigResponse map(PriceConfig config) {
        return new PriceConfigResponse(
                config.getId(),
                config.getMode(),
                config.getResourceType(),
                config.getPricePerUnit(),
                config.getUnit(),
                config.getCurrency(),
                config.isActive(),
                config.getCreatedAt(),
                config.getUpdatedAt());
    }
}
