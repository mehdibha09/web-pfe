INSERT INTO tenants (name, contact_email, mode_deployment, status, created_at, updated_at)
SELECT 'default-tenant', 'admin@gmail.com', 'VM', 'ACTIVE', now(), now()
WHERE NOT EXISTS (
    SELECT 1
    FROM tenants
    WHERE name = 'default-tenant'
);

INSERT INTO users (tenant_id, email, password, status, created_at, updated_at)
SELECT t.id, 'admin@gmail.com', 'test', 'ACTIVE', now(), now()
FROM tenants t
WHERE t.name = 'default-tenant'
  AND NOT EXISTS (
      SELECT 1
      FROM users u
      WHERE u.tenant_id = t.id
        AND u.email = 'admin@gmail.com'
  );