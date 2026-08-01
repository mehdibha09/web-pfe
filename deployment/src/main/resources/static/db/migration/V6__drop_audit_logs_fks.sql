-- V6__drop_audit_logs_fks.sql
-- audit_logs.user_id / tenant_id reference auth-service data, not the
-- deployment DB's own users/tenants tables. These constraints always fail,
-- so audit writes are best-effort without them.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fkjs4iimve3y0xssbtve5ysyef0;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fkqquet9030xtkk7jyvqwuy1byu;
