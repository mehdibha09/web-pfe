package com.cloud_pricer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.AlertRepository;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/**
 * Valide la garde multi-tenant (anti-IDOR) appliquée aux mutations d'alertes :
 * un gestionnaire ne peut ack / résoudre / supprimer que les alertes de SON tenant.
 */
@ExtendWith(MockitoExtension.class)
class AlertServiceTenantGuardTest {

    @Mock
    private AlertRepository alertRepository;

    private AlertService alertService;

    private final UUID ownTenant = UUID.randomUUID();
    private final UUID otherTenant = UUID.randomUUID();
    private final UUID alertId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        alertService = new AlertService(alertRepository);
        UserContext.set(userId, ownTenant, Set.of("ALERT_READ", "ALERT_MANAGE"), Set.of("admin"));
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    private Alert alertOwnedBy(UUID tenantId) {
        Alert alert = new Alert();
        alert.setId(alertId);
        alert.setTenantId(tenantId);
        alert.setStatus("OPEN");
        return alert;
    }

    @Test
    @DisplayName("acknowledge autorise l'alerte de son propre tenant")
    void acknowledgeAllowsOwnTenantAlert() {
        Alert own = alertOwnedBy(ownTenant);
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(own));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        Alert result = alertService.acknowledge(alertId, userId);

        assertThat(result.getStatus()).isEqualTo("ACK");
        assertThat(result.getAcknowledgedBy()).isEqualTo(userId.toString());
        verify(alertRepository).save(own);
    }

    @Test
    @DisplayName("acknowledge refusé (404) pour une alerte d'un autre tenant")
    void acknowledgeRejectsForeignTenantAlert() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alertOwnedBy(otherTenant)));

        assertThatThrownBy(() -> alertService.acknowledge(alertId, userId))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);

        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    @DisplayName("resolve refusé (404) pour une alerte d'un autre tenant")
    void resolveRejectsForeignTenantAlert() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alertOwnedBy(otherTenant)));

        assertThatThrownBy(() -> alertService.resolve(alertId))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    @DisplayName("resolve autorise l'alerte de son propre tenant")
    void resolveAllowsOwnTenantAlert() {
        Alert own = alertOwnedBy(ownTenant);
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(own));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        Alert result = alertService.resolve(alertId);

        assertThat(result.getStatus()).isEqualTo("RESOLVED");
        assertThat(result.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("delete ne supprime PAS une alerte d'un autre tenant")
    void deleteRejectsForeignTenantAlert() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alertOwnedBy(otherTenant)));

        assertThatThrownBy(() -> alertService.delete(alertId))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        verify(alertRepository, never()).delete(any(Alert.class));
    }

    @Test
    @DisplayName("delete supprime bien l'alerte de son propre tenant")
    void deleteAllowsOwnTenantAlert() {
        Alert own = alertOwnedBy(ownTenant);
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(own));

        alertService.delete(alertId);

        verify(alertRepository).delete(own);
    }

    @Test
    @DisplayName("alerte inexistante -> 404")
    void missingAlertThrowsNotFound() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> alertService.resolve(alertId))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
    }
}
