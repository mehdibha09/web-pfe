-- Add the auto-stop flag to the shared 'quota' table.
-- The entity maps this column as NOT NULL (default false), so we add it with a
-- DEFAULT to remain safe on tables that already contain rows.
ALTER TABLE quota ADD COLUMN IF NOT EXISTS auto_stop_on_exceed boolean NOT NULL DEFAULT false;
