CREATE TABLE IF NOT EXISTS deployment_template (
    id              UUID         PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    docker_image    VARCHAR(255) NOT NULL,
    port            INTEGER      NOT NULL DEFAULT 80,
    cpu_limit       VARCHAR(50),
    memory_limit    VARCHAR(50),
    cpu_request     VARCHAR(50),
    memory_request  VARCHAR(50),
    env_vars        TEXT,
    labels          TEXT,
    protocol        VARCHAR(10)  DEFAULT 'TCP',
    image_pull_policy VARCHAR(50) DEFAULT 'IfNotPresent',
    service_type    VARCHAR(50)  DEFAULT 'ClusterIP',
    restart_policy  VARCHAR(50)  DEFAULT 'Always',
    liveness_probe  TEXT,
    readiness_probe TEXT,
    startup_probe   TEXT,
    tenant_id       UUID         NOT NULL,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployment_template_tenant ON deployment_template (tenant_id);
