ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS browser text,
    ADD COLUMN IF NOT EXISTS os text,
    ADD COLUMN IF NOT EXISTS localization text;
