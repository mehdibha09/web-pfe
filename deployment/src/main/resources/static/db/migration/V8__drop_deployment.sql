-- V8__drop_deployment.sql
-- The manual "deployment" table (hand-edited deployment log book) is removed.
-- Real deployment/action history now lives in the auto-populated `audit_logs`
-- table (written by AuditService.record for VM/K8s/service actions).
DROP TABLE IF EXISTS deployment;
