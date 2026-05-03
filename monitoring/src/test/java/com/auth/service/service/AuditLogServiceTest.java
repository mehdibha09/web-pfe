import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AuditLogServiceTest {

    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogService();
    }

    @Test
    void testCreateAuditLog() {
        // Arrange
        String expectedLog = "Audit log entry";

        // Act
        auditLogService.createAuditLog(expectedLog);
        String actualLog = auditLogService.getLastAuditLog();

        // Assert
        assertEquals(expectedLog, actualLog);
    }

    @Test
    void testGetAuditLogs() {
        // Act
        auditLogService.createAuditLog("First log");
        auditLogService.createAuditLog("Second log");

        // Assert
        assertEquals(2, auditLogService.getAuditLogs().size());
    }
}