import type { Language, Commune } from './common'

export interface CitizenTicketSummary {
  id: string
  categorieService: string
  statut: string
  createdAt: string
}

export interface Citizen {
  id: string
  telephone: string
  prenom?: string
  nomFamille?: string
  commune?: Commune
  languePreferee: Language
  notes: string
  nbDemandesTotales: number
  tickets?: CitizenTicketSummary[]
  createdAt: string
  updatedAt: string
}

export interface CitizenHistory {
  citizen: Citizen
  tickets: Array<{
    id: string
    categorieService: string
    statut: string
    createdAt: string
  }>
}
