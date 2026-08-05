-- V7__persist_tracking_fields.sql
-- Persist fields previously marked @Transient + new alertId + status rename QUEUED → PENDING

-- Deployment: deployed_at (tenant_id already exists)
ALTER TABLE deployment ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP;

-- VM: created_by / updated_by
ALTER TABLE vm ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE vm ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Notification: alert_id
ALTER TABLE notification ADD COLUMN IF NOT EXISTS alert_id UUID;

-- Deployment status: rename QUEUED → PENDING (sync with frontend)
UPDATE deployment SET status = 'PENDING' WHERE status = 'QUEUED';
ALTER TABLE deployment ALTER COLUMN status SET DEFAULT 'PENDING';
