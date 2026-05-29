import prisma from '@/lib/prisma'
import type { ProviderScore } from '@allo-joy/types'

interface MatchingParams {
  commune: string
  categorie: string
  lat?: number
  lng?: number
  limit?: number
}

export async function findTopProviders(params: MatchingParams): Promise<ProviderScore[]> {
  const { commune, categorie, lat, lng, limit = 3 } = params

  // Spatial query via SQL raw — PostGIS ne peut pas être exprimé en Prisma ORM
  const hasLocation = lat !== undefined && lng !== undefined

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    WITH filtered AS (
      SELECT
        p.*,
        ${hasLocation
          ? prisma.$queryRaw`ST_Distance(p.position_gps, ST_Point(${lng}, ${lat})::geography) / 1000.0`
          : prisma.$queryRaw`NULL`
        } AS distance_km
      FROM providers p
      WHERE p.statut = 'DISPONIBLE'
        AND ${commune}::text = ANY(p.communes_intervention::text[])
        AND p.categorie_principale = ${categorie}
        ${hasLocation
          ? prisma.$queryRaw`AND ST_DWithin(p.position_gps, ST_Point(${lng}, ${lat})::geography, 20000)`
          : prisma.$queryRaw``
        }
    )
    SELECT *,
      ROUND(
        (COALESCE(note_moyenne, 0) / 5.0 * 0.40) +
        (COALESCE(
          CASE WHEN nb_missions_totales > 0
            THEN nb_missions_reussies::float / nb_missions_totales
            ELSE 0 END, 0) * 0.30) +
        (CASE WHEN distance_km IS NOT NULL
          THEN GREATEST(0, 1.0 - distance_km / 10.0) * 0.20
          ELSE 0.10 END) +
        (COALESCE(taux_reactivite, 0) * 0.10),
        4
      ) AS score
    FROM filtered
    ORDER BY score DESC
    LIMIT ${limit}
  `

  return rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    nomComplet: row.nom_complet as string,
    telephonePrincipal: row.telephone_principal as string,
    telephoneBackup: row.telephone_backup as string | undefined,
    categoriePrincipale: row.categorie_principale as string,
    sousCategories: (row.sous_categories as string[]) ?? [],
    communesIntervention: row.communes_intervention as any,
    noteMoyenne: Number(row.note_moyenne),
    nbMissionsTotales: Number(row.nb_missions_totales),
    nbMissionsReussies: Number(row.nb_missions_reussies),
    tauxReactivite: Number(row.taux_reactivite),
    statut: row.statut as any,
    abonnementTier: row.abonnement_tier as any,
    dateExpirationAbonnement: row.date_expiration_abonnement as string | undefined,
    dateVerificationTerrain: row.date_verification_terrain as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    score: Number(row.score),
    distanceKm: row.distance_km !== null ? Number(row.distance_km) : -1,
  }))
}
