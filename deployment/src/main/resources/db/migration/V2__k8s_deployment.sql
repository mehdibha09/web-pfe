-- V2__k8s_deployment.sql

CREATE TABLE IF NOT EXISTS k8s_deployment (
    id                     UUID         PRIMARY KEY,
    name                   VARCHAR(255) NOT NULL,
    docker_image           VARCHAR(255) NOT NULL,
    replicas               INTEGER      NOT NULL DEFAULT 1,
    port                   INTEGER      NOT NULL,
    namespace              VARCHAR(255) NOT NULL DEFAULT 'default',
    status                 VARCHAR(50)  NOT NULL,
    service_environment_id UUID         NOT NULL,
    tenant_id              UUID         NOT NULL,
    env_vars               TEXT,
    cpu_limit              VARCHAR(50),
    memory_limit           VARCHAR(50),
    created_at             TIMESTAMP    NOT NULL,
    updated_at             TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_k8s_deployment_service_env
    ON k8s_deployment (service_environment_id);

CREATE INDEX IF NOT EXISTS idx_k8s_deployment_tenant
    ON k8s_deployment (tenant_id);
