-- V1__init.sql

-- ── Environment ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS environment (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    tenant_id   UUID         NOT NULL,
    description VARCHAR(255),                -- nullable (entity pas nullable=false)
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL
);

-- ── Service ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service (
    id         UUID         PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(255) NOT NULL,
    status     VARCHAR(50)  NOT NULL,
    tenant_id  UUID         NOT NULL,
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP    NOT NULL
);

-- ── Service Environment ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_environment (  -- ← corrigé (était serviceEnvironment)
    id             UUID      PRIMARY KEY,
    service_id     UUID      NOT NULL,
    environment_id UUID      NOT NULL,
    tenant_id      UUID      NOT NULL,
    created_at     TIMESTAMP NOT NULL,
    updated_at     TIMESTAMP NOT NULL
);

-- ── Deployment ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment (
    id                     UUID         PRIMARY KEY,
    version                VARCHAR(255) NOT NULL,
    status                 VARCHAR(50)  NOT NULL  DEFAULT 'QUEUED',
    notes                  VARCHAR(255),           -- nullable
    deployed_by            UUID,                   -- nullable
    service_environment_id UUID         NOT NULL,  -- ← corrigé (était serviceEnvironment_id)
    tenant_id              UUID         NOT NULL,
    created_at             TIMESTAMP    NOT NULL,
    updated_at             TIMESTAMP    NOT NULL
);

-- ── Metric ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metric (
    id                     UUID      PRIMARY KEY,
    service_environment_id UUID      NOT NULL,     -- ← corrigé (était serviceEnvironment_id)
    cpu_usage              REAL      NOT NULL,
    ram_usage              REAL      NOT NULL,
    network_usage          REAL      NOT NULL,
    disk_usage             REAL      NOT NULL,
    pods                   INTEGER   NOT NULL DEFAULT 0,
    tenant_id              UUID,
    timestamp              TIMESTAMP NOT NULL,
    created_at             TIMESTAMP NOT NULL,
    updated_at             TIMESTAMP NOT NULL
);

-- ── VM ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vm (
    id                     UUID         PRIMARY KEY,
    name                   VARCHAR(255) NOT NULL,
    cpu                    INTEGER      NOT NULL,
    ram                    INTEGER      NOT NULL,
    disk                   INTEGER      NOT NULL,
    os                     VARCHAR(50)  NOT NULL,
    status                 VARCHAR(50)  NOT NULL  DEFAULT 'PENDING',
    tenant_id              UUID         NOT NULL,
    service_environment_id UUID         NOT NULL,
    ip_address             VARCHAR(255),
    ssh_port               INTEGER,
    ssh_user               VARCHAR(255)           DEFAULT 'vagrant',
    vagrant_path           VARCHAR(500),
    network_name           VARCHAR(255),
    backup_enabled         BOOLEAN      NOT NULL  DEFAULT false,
    created_at             TIMESTAMP    NOT NULL,
    updated_at             TIMESTAMP    NOT NULL
);

-- ── Backup ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backup (
    id                     UUID         PRIMARY KEY,
    vm_id                  UUID,
    service_environment_id UUID         NOT NULL,
    tenant_id              UUID         NOT NULL,
    status                 VARCHAR(50)  NOT NULL  DEFAULT 'PENDING',
    file_path              VARCHAR(500),
    size_mb                BIGINT,
    type                   VARCHAR(50)  NOT NULL  DEFAULT 'MANUAL',
    notes                  VARCHAR(255),
    created_at             TIMESTAMP    NOT NULL,
    updated_at             TIMESTAMP    NOT NULL,
    restored_at            TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_tenant
    ON service (tenant_id);

CREATE INDEX IF NOT EXISTS idx_environment_tenant
    ON environment (tenant_id);

CREATE INDEX IF NOT EXISTS idx_service_environment_service
    ON service_environment (service_id);

CREATE INDEX IF NOT EXISTS idx_service_environment_env
    ON service_environment (environment_id);

CREATE INDEX IF NOT EXISTS idx_service_environment_tenant
    ON service_environment (tenant_id);

CREATE INDEX IF NOT EXISTS idx_deployment_service_env
    ON deployment (service_environment_id);

CREATE INDEX IF NOT EXISTS idx_deployment_status
    ON deployment (status);

CREATE INDEX IF NOT EXISTS idx_metric_service_env
    ON metric (service_environment_id);

CREATE INDEX IF NOT EXISTS idx_metric_timestamp
    ON metric (timestamp);

CREATE INDEX IF NOT EXISTS idx_vm_tenant
    ON vm (tenant_id);

CREATE INDEX IF NOT EXISTS idx_vm_service_env
    ON vm (service_environment_id);

CREATE INDEX IF NOT EXISTS idx_vm_status
    ON vm (status);

CREATE INDEX IF NOT EXISTS idx_backup_vm
    ON backup (vm_id);

CREATE INDEX IF NOT EXISTS idx_backup_service_env
    ON backup (service_environment_id);

CREATE INDEX IF NOT EXISTS idx_backup_status
    ON backup (status);