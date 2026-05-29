import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProviderStatus = 'disponible' | 'occupe' | 'hors_ligne'
export type MissionStatus  = 'en_cours' | 'termine' | 'annule' | 'refuse'

export interface MissionSummary {
  id: string
  categorieService: string
  commune: string
  description: string
  citizenPhone: string
  assignedAt: number
  completedAt: number | null
  status: MissionStatus
  noteRecue: number | null
}

export interface IncomingRequest {
  ticketId: string
  categorieService: string
  commune: string
  description: string
  citizenPhone: string
  receivedAt: number
}

interface ProviderState {
  // Auth — persisted
  accessToken:       string | null
  prenom:            string | null
  nomFamille:        string | null
  telephone:         string | null
  categorieService:  string | null
  langues:           string[]
  noteMoyenne:       number
  tauxReussite:      number
  totalMissions:     number

  // Live
  status:          ProviderStatus
  incomingRequest: IncomingRequest | null
  currentMission:  MissionSummary | null
  missions:        MissionSummary[]
  missionsToday:   number

  // Auth actions
  setAuth: (p: {
    accessToken: string; prenom: string; nomFamille: string;
    telephone: string; categorieService: string; langues: string[];
    noteMoyenne: number; tauxReussite: number; totalMissions: number;
  }) => void
  logout: () => void

  // Status
  setStatus: (s: ProviderStatus) => void

  // Missions
  setIncomingRequest: (r: IncomingRequest | null) => void
  acceptMission: () => void
  declineMission: () => void
  completeMission: () => void
  setMissions: (m: MissionSummary[]) => void
  setMissionsToday: (n: number) => void
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      accessToken:      null,
      prenom:           null,
      nomFamille:       null,
      telephone:        null,
      categorieService: null,
      langues:          [],
      noteMoyenne:      0,
      tauxReussite:     0,
      totalMissions:    0,
      status:           'hors_ligne',
      incomingRequest:  null,
      currentMission:   null,
      missions:         [],
      missionsToday:    0,

      setAuth: (p) => set({
        accessToken:      p.accessToken,
        prenom:           p.prenom,
        nomFamille:       p.nomFamille,
        telephone:        p.telephone,
        categorieService: p.categorieService,
        langues:          p.langues,
        noteMoyenne:      p.noteMoyenne,
        tauxReussite:     p.tauxReussite,
        totalMissions:    p.totalMissions,
        status:           'disponible',
      }),

      logout: () => set({
        accessToken: null, prenom: null, nomFamille: null,
        telephone: null, categorieService: null, status: 'hors_ligne',
        incomingRequest: null, currentMission: null,
      }),

      setStatus: (s) => set({ status: s }),

      setIncomingRequest: (r) => set({ incomingRequest: r }),

      acceptMission: () => {
        const req = get().incomingRequest
        if (!req) return
        const mission: MissionSummary = {
          id:               req.ticketId,
          categorieService: req.categorieService,
          commune:          req.commune,
          description:      req.description,
          citizenPhone:     req.citizenPhone,
          assignedAt:       Date.now(),
          completedAt:      null,
          status:           'en_cours',
          noteRecue:        null,
        }
        set({ incomingRequest: null, currentMission: mission, status: 'occupe' })
      },

      declineMission: () => {
        const req = get().incomingRequest
        if (!req) return
        const declined: MissionSummary = {
          id:               req.ticketId,
          categorieService: req.categorieService,
          commune:          req.commune,
          description:      req.description,
          citizenPhone:     req.citizenPhone,
          assignedAt:       req.receivedAt,
          completedAt:      Date.now(),
          status:           'refuse',
          noteRecue:        null,
        }
        set((s) => ({
          incomingRequest: null,
          missions: [declined, ...s.missions],
        }))
      },

      completeMission: () => {
        const m = get().currentMission
        if (!m) return
        const done: MissionSummary = { ...m, completedAt: Date.now(), status: 'termine' }
        set((s) => ({
          currentMission: null,
          status:         'disponible',
          missions:       [done, ...s.missions],
          missionsToday:  s.missionsToday + 1,
          totalMissions:  s.totalMissions + 1,
        }))
      },

      setMissions:     (m) => set({ missions: m }),
      setMissionsToday: (n) => set({ missionsToday: n }),
    }),
    {
      name: 'allo-joy-provider',
      partialize: (s) => ({
        accessToken: s.accessToken, prenom: s.prenom, nomFamille: s.nomFamille,
        telephone: s.telephone, categorieService: s.categorieService,
        langues: s.langues, noteMoyenne: s.noteMoyenne,
        tauxReussite: s.tauxReussite, totalMissions: s.totalMissions,
      }),
    }
  )
)
