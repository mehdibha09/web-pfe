import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RoleServiceTest {

    private RoleService roleService;

    @BeforeEach
    void setUp() {
        roleService = new RoleService();
    }

    @Test
    void testRoleCreation() {
        Role role = roleService.createRole("Admin");
        assertNotNull(role);
        assertEquals("Admin", role.getName());
    }

    @Test
    void testRoleDeletion() {
        Role role = roleService.createRole("User");
        roleService.deleteRole(role.getId());
        assertNull(roleService.findRoleById(role.getId()));
    }

    @Test
    void testRoleUpdate() {
        Role role = roleService.createRole("User");
        role.setName("SuperUser");
        roleService.updateRole(role);
        assertEquals("SuperUser", roleService.findRoleById(role.getId()).getName());
    }
}