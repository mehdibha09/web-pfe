ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code text;
UPDATE tenants SET code = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6)) WHERE code IS NULL OR code = '';
CREATE UNIQUE INDEX IF NOT EXISTS tenants_code_uk ON tenants (code);
