ALTER TABLE deployment_template ADD COLUMN IF NOT EXISTS public_template BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_deployment_template_visibility ON deployment_template (public_template);
