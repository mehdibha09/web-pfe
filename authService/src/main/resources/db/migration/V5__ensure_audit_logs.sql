CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    details text,
    resource text,
    resource_id text
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_ts_idx ON audit_logs(tenant_id, timestamp);