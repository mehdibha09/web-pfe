import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PermissionServiceTest {

    private PermissionService permissionService;

    @BeforeEach
    void setUp() {
        permissionService = new PermissionService();
    }

    @Test
    void testPermissionHandling() {
        // Example test case
        assertTrue(permissionService.hasPermission("user", "read"));
        assertFalse(permissionService.hasPermission("user", "write"));
    }
}