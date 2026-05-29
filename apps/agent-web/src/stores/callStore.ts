import { create } from 'zustand'
import type { Citizen, Ticket, ProviderScore } from '@allo-joy/types'

export type RightPanel = 'providers' | 'map' | 'docs'

interface IncomingCall {
  callId: string
  citizenPhone: string
  citizen: Citizen | null
}

interface CallState {
  // Appel en cours
  activeCall: IncomingCall | null
  callStartedAt: number | null

  // File d'attente
  queue: IncomingCall[]

  // Ticket en cours de création/édition
  currentTicket: Partial<Ticket> | null
  ticketId: string | null

  // Citoyen chargé
  citizen: Citizen | null

  // Résultats prestataires
  providers: ProviderScore[]
  loadingProviders: boolean

  // Panneau droit actif
  rightPanel: RightPanel

  // Actions
  incomingCall: (call: IncomingCall) => void
  acceptCall: (call: IncomingCall) => void
  endCall: () => void
  setCitizen: (citizen: Citizen) => void
  setTicketField: (field: string, value: unknown) => void
  setProviders: (providers: ProviderScore[], loading?: boolean) => void
  setRightPanel: (panel: RightPanel) => void
  addToQueue: (call: IncomingCall) => void
  removeFromQueue: (callId: string) => void
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  callStartedAt: null,
  queue: [],
  currentTicket: null,
  ticketId: null,
  citizen: null,
  providers: [],
  loadingProviders: false,
  rightPanel: 'providers',

  incomingCall: (call) =>
    set((s) => ({
      queue: [...s.queue, call],
    })),

  acceptCall: (call) =>
    set({
      activeCall: call,
      callStartedAt: Date.now(),
      citizen: call.citizen,
      currentTicket: {
        langue: call.citizen?.languePreferee ?? 'fr',
        commune: call.citizen?.commune ?? undefined,
      },
    }),

  endCall: () =>
    set({
      activeCall: null,
      callStartedAt: null,
      currentTicket: null,
      ticketId: null,
      providers: [],
    }),

  setCitizen: (citizen) => set({ citizen }),

  setTicketField: (field, value) =>
    set((s) => ({
      currentTicket: { ...s.currentTicket, [field]: value },
    })),

  setProviders: (providers, loading = false) =>
    set({ providers, loadingProviders: loading }),

  setRightPanel: (rightPanel) => set({ rightPanel }),

  addToQueue: (call) =>
    set((s) => ({ queue: [...s.queue, call] })),

  removeFromQueue: (callId) =>
    set((s) => ({ queue: s.queue.filter((c) => c.callId !== callId) })),
}))
