import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SessionServiceTest {

    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService();
    }

    @Test
    void testSessionCreation() {
        Session session = sessionService.createSession("userId");
        assertNotNull(session);
        assertEquals("userId", session.getUserId());
    }

    @Test
    void testSessionExpiration() {
        Session session = sessionService.createSession("userId");
        sessionService.expireSession(session.getId());
        assertTrue(sessionService.isSessionExpired(session.getId()));
    }
}