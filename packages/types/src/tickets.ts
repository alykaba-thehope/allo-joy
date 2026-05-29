import type { Language, Commune } from './common'

export type TicketStatus =
  | 'OUVERT'
  | 'EN_COURS'
  | 'MISE_EN_RELATION'
  | 'RESOLU'
  | 'CLOTURE'

export interface Ticket {
  id: string
  citizenId: string
  agentId: string
  statut: TicketStatus
  categorieService: string
  commune?: Commune
  langue: Language
  descriptionBesoin: string
  providerId?: string
  callId?: string
  rappelProgrammeAt?: string
  notes: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface CreateTicketInput {
  citizenPhone: string
  agentId: string
  categorieService: string
  commune?: Commune
  langue: Language
  descriptionBesoin: string
  callId?: string
}

export interface CallbackInput {
  ticketId: string
  scheduledAt: string
  notes?: string
}
