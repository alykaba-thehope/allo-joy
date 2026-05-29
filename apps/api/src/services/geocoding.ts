import prisma from '@/lib/prisma'
import type { Place, GpsPoint } from '@allo-joy/types'

export async function searchPlaces(query: string, commune?: string): Promise<Place[]> {
  const normalized = query.trim().toLowerCase()

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT *,
      -- Score de pertinence : correspondance exacte > partielle > synonyme
      CASE
        WHEN LOWER(nom_officiel) = ${normalized} THEN 1.0
        WHEN LOWER(nom_local) = ${normalized} THEN 0.95
        WHEN LOWER(nom_officiel) LIKE ${'%' + normalized + '%'} THEN 0.7
        WHEN LOWER(nom_local) LIKE ${'%' + normalized + '%'} THEN 0.65
        WHEN LOWER(nom_pular) LIKE ${'%' + normalized + '%'} THEN 0.6
        WHEN LOWER(nom_malinke) LIKE ${'%' + normalized + '%'} THEN 0.6
        WHEN LOWER(nom_soussou) LIKE ${'%' + normalized + '%'} THEN 0.6
        ELSE 0.0
      END AS confidence_score
    FROM places
    WHERE (
      LOWER(nom_officiel) LIKE ${'%' + normalized + '%'}
      OR LOWER(nom_local) LIKE ${'%' + normalized + '%'}
      OR LOWER(nom_pular) LIKE ${'%' + normalized + '%'}
      OR LOWER(nom_malinke) LIKE ${'%' + normalized + '%'}
      OR LOWER(nom_soussou) LIKE ${'%' + normalized + '%'}
    )
    ${commune ? prisma.$queryRaw`AND commune = ${commune}` : prisma.$queryRaw``}
    ORDER BY confidence_score DESC
    LIMIT 10
  `

  return rows.map(mapPlaceRow)
}

export async function reverseGeocode(point: GpsPoint): Promise<Place | null> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT *,
      ST_Distance(position, ST_Point(${point.lng}, ${point.lat})::geography) AS distance_m
    FROM places
    WHERE is_verified = true
    ORDER BY position <-> ST_Point(${point.lng}, ${point.lat})::geography
    LIMIT 1
  `

  if (rows.length === 0) return null
  return mapPlaceRow(rows[0]!)
}

function mapPlaceRow(row: Record<string, unknown>): Place {
  return {
    id: row.id as string,
    nomOfficiel: row.nom_officiel as string,
    nomLocal: row.nom_local as string | undefined,
    nomPular: row.nom_pular as string | undefined,
    nomMalinke: row.nom_malinke as string | undefined,
    nomSoussou: row.nom_soussou as string | undefined,
    commune: row.commune as any,
    quartier: row.quartier as string | undefined,
    position: { lat: 0, lng: 0 }, // populated via separate ST_AsGeoJSON if needed
    precisionMetres: Number(row.precision_metres),
    typeLieu: row.type_lieu as any,
    repereProximite: (row.repere_proximite as string[]) ?? [],
    photosFacadeUrl: (row.photos_facade_url as string[]) ?? [],
    horaires: row.horaires as Record<string, string> | undefined,
    contact: row.contact as string | undefined,
    dateVerification: row.date_verification as string | undefined,
    confidenceScore: row.confidence_score !== undefined ? Number(row.confidence_score) : undefined,
  }
}
