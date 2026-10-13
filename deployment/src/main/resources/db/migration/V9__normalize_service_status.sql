-- Normalise les valeurs de status de l'entité Service vers la convention UI
-- (ACTIVE / DISABLED / PENDING / FAILED) alignée avec le frontend.
UPDATE service SET status = 'DISABLED' WHERE status = 'INACTIVE';
UPDATE service SET status = 'PENDING'  WHERE status = 'DEPLOYING';
