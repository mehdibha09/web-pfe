package com.auth.auth.web.routes;

public final class ApiRoutes {
    private ApiRoutes() {
    }

    public static final String API_V1 = "/api/v1";

    public static final class Auth {
        private Auth() {
        }

        public static final String BASE = API_V1 + "/auth";
        public static final String LOGIN = "/login";
        public static final String REFRESH = "/refresh";
        public static final String LOGOUT = "/logout";
        public static final String ME = "/me";
        public static final String CHANGE_PASSWORD = "/change-password";
        public static final String FORGOT_PASSWORD = "/forgot-password";
        public static final String RESET_PASSWORD = "/reset-password";
        public static final String SSO_REDIRECT = "/sso/{provider}/redirect";
        public static final String SSO_CALLBACK = "/sso/{provider}/callback";
        public static final String TWO_FA_SETUP = "/2fa/setup";
        public static final String TWO_FA_VERIFY = "/2fa/verify";
        public static final String TWO_FA_DISABLE = "/2fa";
    }

    public static final class Roles {
        private Roles() {
        }

        public static final String BASE = API_V1 + "/roles";
        public static final String BY_ID = "/{roleId}";
        public static final String PERMISSIONS = "/{roleId}/permissions";
        public static final String PERMISSION_BY_ID = "/{roleId}/permissions/{permissionId}";
        public static final String USERS = "/{roleId}/users";
        public static final String USER_BY_ID = "/{roleId}/users/{userId}";
    }

    public static final class Users {
        private Users() {
        }

        public static final String BASE = API_V1 + "/users";
        public static final String BY_ID = "/{userId}";
    }

    public static final class Permissions {
        private Permissions() {
        }

        public static final String BASE = API_V1 + "/permissions";
        public static final String BY_ID = "/{permissionId}";
    }

    public static final class Sessions {
        private Sessions() {
        }

        public static final String BASE = API_V1 + "/sessions";
        public static final String BY_ID = "/{sessionId}";
    }

    public static final class AuditLogs {
        private AuditLogs() {
        }

        public static final String BASE = API_V1 + "/audit-logs";
        public static final String RESOURCES = "/resources";
    }

    public static final class Tenants {
        private Tenants() {
        }

        public static final String BASE = API_V1 + "/tenants";
        public static final String BY_ID = "/{tenantId}";
        public static final String USERS = "/{tenantId}/users";
        public static final String ROLES = "/{tenantId}/roles";
    }
}
