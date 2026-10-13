-- Add the 'started_at' tracking column to the 'vm' table.
-- Both the deployment service (writer) and cloud-pricer (reader, for billing)
-- map this field. It is nullable: VMs created before this column keep NULL.
ALTER TABLE vm ADD COLUMN IF NOT EXISTS started_at timestamp(6) with time zone;
