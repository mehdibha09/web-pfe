-- Ajoute le champ runtime (DOCKER / VAGRANT / K8S) à l'entité Service.
-- Défaut DOCKER pour les lignes existantes.
ALTER TABLE service ADD COLUMN IF NOT EXISTS runtime VARCHAR(50) NOT NULL DEFAULT 'DOCKER';
