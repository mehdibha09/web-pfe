-- Add a notification marker to the shared 'alert' table so that open alerts
-- are emailed only once (not re-sent on every dispatch cycle).
ALTER TABLE alert ADD COLUMN IF NOT EXISTS notified_at timestamp(6) with time zone;
