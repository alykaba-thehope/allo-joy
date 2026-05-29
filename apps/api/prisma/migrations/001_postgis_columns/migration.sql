-- Migration manuelle pour les colonnes PostGIS
-- Prisma ne génère pas ces colonnes — exécuter après `prisma migrate dev`

-- Extension PostGIS (déjà activée via schema.prisma extensions)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Colonne GPS providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS position_gps geography(POINT, 4326);

-- Index spatial GIST providers
CREATE INDEX IF NOT EXISTS idx_providers_position_gps
  ON providers USING GIST(position_gps);

-- Index partiel pour le matching rapide (filtre sur DISPONIBLE)
CREATE INDEX IF NOT EXISTS idx_providers_matching
  ON providers(categorie_principale, note_moyenne DESC)
  WHERE statut = 'DISPONIBLE';

-- Colonne GPS places
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS position geography(POINT, 4326);

-- Places: la position est NOT NULL en prod, mais on la rend nullable pour la migration
-- À contraindre après import OSM initial
-- ALTER TABLE places ALTER COLUMN position SET NOT NULL;

-- Index spatial GIST places
CREATE INDEX IF NOT EXISTS idx_places_position
  ON places USING GIST(position);

-- Index full-text pour la recherche de lieux (multilingue)
CREATE INDEX IF NOT EXISTS idx_places_search
  ON places USING GIN(
    to_tsvector('french',
      COALESCE(nom_officiel, '') || ' ' ||
      COALESCE(nom_local, '') || ' ' ||
      COALESCE(nom_pular, '') || ' ' ||
      COALESCE(nom_malinke, '') || ' ' ||
      COALESCE(nom_soussou, '')
    )
  );
