import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AgentStatus = 'available' | 'busy' | 'break' | 'offline'

interface AgentState {
  id: string | null
  prenom: string | null
  role: string | null
  status: AgentStatus
  accessToken: string | null
  setAgent: (agent: { id: string; prenom: string; role: string }) => void
  setToken: (token: string) => void
  setStatus: (status: AgentStatus) => void
  logout: () => void
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      id: null,
      prenom: null,
      role: null,
      status: 'offline',
      accessToken: null,

      setAgent: (agent) => set({ ...agent, status: 'available' }),
      setToken: (token) => set({ accessToken: token }),
      setStatus: (status) => set({ status }),
      logout: () => set({ id: null, prenom: null, role: null, accessToken: null, status: 'offline' }),
    }),
    {
      name: 'allo-joy-agent',
      partialize: (s) => ({ id: s.id, prenom: s.prenom, role: s.role, accessToken: s.accessToken }),
    }
  )
)
