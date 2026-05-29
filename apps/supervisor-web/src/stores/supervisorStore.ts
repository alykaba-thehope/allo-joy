import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AgentStatus = 'available' | 'busy' | 'break' | 'offline'

export interface LiveAgent {
  id: string
  prenom: string
  nomFamille: string
  status: AgentStatus
  currentCallId: string | null
  callStartedAt: number | null
  ticketsToday: number
  lastSeenAt: number
  langue: string[]
}

export interface LiveCall {
  callId: string
  citizenPhone: string
  agentId: string | null
  agentName: string | null
  langue: string
  startedAt: number
  status: 'waiting' | 'active'
}

export interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info'
  message: string
  createdAt: number
  dismissed: boolean
}

export interface DayKpi {
  callsTotal: number
  callsResolved: number
  avgDurationSeconds: number
  resolutionRate: number
  peakHour: string
}

interface SupervisorState {
  // Auth
  accessToken: string | null
  prenom: string | null
  setAuth: (token: string, prenom: string) => void
  logout: () => void

  // Live data
  agents: LiveAgent[]
  queue: LiveCall[]
  activeCalls: LiveCall[]
  alerts: Alert[]
  kpi: DayKpi

  // Actions
  setAgents: (agents: LiveAgent[]) => void
  updateAgentStatus: (agentId: string, status: AgentStatus) => void
  setQueue: (queue: LiveCall[]) => void
  addToQueue: (call: LiveCall) => void
  removeFromQueue: (callId: string) => void
  promoteToActive: (callId: string, agentId: string, agentName: string) => void
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'dismissed'>) => void
  dismissAlert: (id: string) => void
  setKpi: (kpi: DayKpi) => void
}

export const useSupervisorStore = create<SupervisorState>()(
  persist(
    (set) => ({
      accessToken: null,
      prenom: null,
      agents: [],
      queue: [],
      activeCalls: [],
      alerts: [],
      kpi: { callsTotal: 0, callsResolved: 0, avgDurationSeconds: 0, resolutionRate: 0, peakHour: '—' },

      setAuth: (token, prenom) => set({ accessToken: token, prenom }),
      logout: () => set({ accessToken: null, prenom: null }),

      setAgents: (agents) => set({ agents }),

      updateAgentStatus: (agentId, status) =>
        set((s) => ({
          agents: s.agents.map((a) => a.id === agentId ? { ...a, status } : a),
        })),

      setQueue: (queue) => set({ queue }),

      addToQueue: (call) =>
        set((s) => ({ queue: [...s.queue, call] })),

      removeFromQueue: (callId) =>
        set((s) => ({ queue: s.queue.filter((c) => c.callId !== callId) })),

      promoteToActive: (callId, agentId, agentName) =>
        set((s) => {
          const call = s.queue.find((c) => c.callId === callId)
          if (!call) return s
          return {
            queue: s.queue.filter((c) => c.callId !== callId),
            activeCalls: [...s.activeCalls, { ...call, agentId, agentName, status: 'active' as const }],
          }
        }),

      addAlert: (alert) =>
        set((s) => ({
          alerts: [
            { ...alert, id: `alert-${Date.now()}`, createdAt: Date.now(), dismissed: false },
            ...s.alerts,
          ].slice(0, 20),
        })),

      dismissAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a),
        })),

      setKpi: (kpi) => set({ kpi }),
    }),
    {
      name: 'allo-joy-supervisor',
      partialize: (s) => ({ accessToken: s.accessToken, prenom: s.prenom }),
    }
  )
)
