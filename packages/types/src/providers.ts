import type { Commune, GpsPoint } from './common'

export type ProviderStatus = 'DISPONIBLE' | 'OCCUPE' | 'HORS_LIGNE' | 'SUSPENDU'
export type ProviderTier = 'GRATUIT' | 'BRONZE' | 'ARGENT' | 'OR'

export interface Provider {
  id: string
  nomComplet: string
  telephonePrincipal: string
  telephoneBackup?: string
  categoriePrincipale: string
  sousCategories: string[]
  communesIntervention: Commune[]
  positionGps?: GpsPoint
  noteMoyenne: number
  nbMissionsTotales: number
  nbMissionsReussies: number
  tauxReactivite: number
  statut: ProviderStatus
  abonnementTier: ProviderTier
  dateExpirationAbonnement?: string
  dateVerificationTerrain?: string
  createdAt: string
  updatedAt: string
}

export interface ProviderScore extends Provider {
  score: number
  distanceKm: number
}

export interface ProviderSearchParams {
  commune?: Commune
  categorie?: string
  available?: boolean
  noteMinimale?: number
  lat?: number
  lng?: number
}

export interface RatingInput {
  note: number
  commentaire?: string
  ticketId: string
}
