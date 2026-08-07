-- Cloud-pricer named tables. The database is shared with deployment-service,
-- which owns the common tables (vm, k8s_deployment, service_environment, alert,
-- audit_logs). This migration only creates cloud-pricer's own tables, using
-- IF NOT EXISTS so it is safe on an already-provisioned shared database.

CREATE TABLE IF NOT EXISTS price_config (
    id             uuid PRIMARY KEY NOT NULL,
    created_at     timestamp(6) with time zone NOT NULL,
    currency       varchar(255) NOT NULL,
    is_active      boolean NOT NULL,
    mode           varchar(255) NOT NULL,
    price_per_unit double precision NOT NULL,
    resource_type  varchar(255) NOT NULL,
    unit           varchar(255) NOT NULL,
    updated_at     timestamp(6) with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS quota (
    id                     uuid PRIMARY KEY NOT NULL,
    created_at             timestamp(6) with time zone NOT NULL,
    is_active              boolean NOT NULL,
    max_budget             double precision,
    max_cpu                double precision,
    max_pods               integer,
    max_ram                double precision,
    max_storage            double precision,
    period                 varchar(255) NOT NULL,
    service_environment_id uuid NOT NULL,
    tenant_id              uuid NOT NULL,
    updated_at             timestamp(6) with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_record (
    id                     uuid PRIMARY KEY NOT NULL,
    backup_cost            double precision,
    compute_cost           double precision,
    created_at             timestamp(6) with time zone NOT NULL,
    mode                   varchar(255) NOT NULL,
    network_cost           double precision,
    os_cost                double precision,
    period_end             timestamp(6) with time zone NOT NULL,
    period_start           timestamp(6) with time zone NOT NULL,
    service_environment_id uuid NOT NULL,
    storage_cost           double precision,
    tenant_id              uuid NOT NULL,
    total_cost             double precision NOT NULL,
    updated_at             timestamp(6) with time zone NOT NULL,
    CONSTRAINT uk_cost_record_se_window_mode UNIQUE (service_environment_id, period_start, period_end, mode)
);

CREATE INDEX IF NOT EXISTS idx_cost_record_se ON cost_record (service_environment_id);

CREATE TABLE IF NOT EXISTS cost_breakdown (
    id             uuid PRIMARY KEY NOT NULL,
    cost_record_id uuid NOT NULL,
    created_at     timestamp(6) with time zone NOT NULL,
    quantity       double precision NOT NULL,
    total          double precision NOT NULL,
    type           varchar(255) NOT NULL,
    unit_cost      double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_forecast (
    id                     uuid PRIMARY KEY NOT NULL,
    confidence_level       double precision,
    created_at             timestamp(6) with time zone NOT NULL,
    period                 varchar(255) NOT NULL,
    predicted_cost         double precision NOT NULL,
    service_environment_id uuid NOT NULL,
    tenant_id              uuid NOT NULL
);