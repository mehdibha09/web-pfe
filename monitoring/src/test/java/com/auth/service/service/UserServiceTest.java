import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest {

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService();
    }

    @Test
    void testUserCreation() {
        User user = userService.createUser("testUser");
        assertNotNull(user);
        assertEquals("testUser", user.getUsername());
    }

    @Test
    void testUserDeletion() {
        User user = userService.createUser("testUser");
        userService.deleteUser(user.getId());
        assertNull(userService.findUserById(user.getId()));
    }
}