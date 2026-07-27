package com.cloud_pricer.web.routes;

public final class ApiRoutes {
    private ApiRoutes() {}
    public static final String API_V1 = "/api/v1";

    public static final class Cost {
        private Cost() {}
        public static final String BASE = API_V1 + "/costs";
    }

    public static final class Quota {
        private Quota() {}
        public static final String BASE = API_V1 + "/quotas";
    }

    public static final class AlertRoute {
        private AlertRoute() {}
        public static final String BASE = API_V1 + "/alerts";
    }

    public static final class Pricing {
        private Pricing() {}
        public static final String BASE = API_V1 + "/pricing";
    }
}
