-- Migration 002: canal_origine + agentId optionnel + TicketStatus FERME/ANNULE
-- Appliqué sur: tickets, citizens

-- ── 1. Nouveaux enums ─────────────────────────────────────────────────────────

CREATE TYPE "CanalOrigine" AS ENUM ('PHONE', 'WHATSAPP', 'USSD', 'APP', 'WEB');

-- Ajouter FERME et ANNULE au TicketStatus existant
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'FERME';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ANNULE';
-- Renommer CLOTURE → FERME n'est pas possible directement en Postgres
-- On garde CLOTURE pour les anciens enregistrements, FERME pour les nouveaux

-- ── 2. Citizens : ajout canalOrigine ─────────────────────────────────────────

ALTER TABLE "citizens"
  ADD COLUMN IF NOT EXISTS "canal_origine" "CanalOrigine" NOT NULL DEFAULT 'PHONE';

CREATE INDEX IF NOT EXISTS "citizens_canal_origine_idx"
  ON "citizens"("canal_origine");

-- ── 3. Tickets : agentId optionnel + canalOrigine ─────────────────────────────

-- Rendre agentId nullable
ALTER TABLE "tickets"
  ALTER COLUMN "agent_id" DROP NOT NULL;

-- Ajouter canalOrigine
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "canal_origine" "CanalOrigine" NOT NULL DEFAULT 'PHONE';

-- Recréer les index (suppression anciens si besoin)
DROP INDEX IF EXISTS "tickets_statut_agent_id_idx";

CREATE INDEX IF NOT EXISTS "tickets_statut_idx"
  ON "tickets"("statut");

CREATE INDEX IF NOT EXISTS "tickets_agent_id_idx"
  ON "tickets"("agent_id");

CREATE INDEX IF NOT EXISTS "tickets_canal_origine_idx"
  ON "tickets"("canal_origine");
