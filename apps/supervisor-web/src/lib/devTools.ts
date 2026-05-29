import { useSupervisorStore } from '@/stores/supervisorStore'

if (import.meta.env.DEV) {
  ;(window as any).__supDev = {
    seed: () => {
      const store = useSupervisorStore.getState()

      store.setAgents([
        { id: 'a1', prenom: 'Fatoumata', nomFamille: 'Bah',    status: 'busy',      currentCallId: 'C1', callStartedAt: Date.now() - 95_000,  ticketsToday: 12, lastSeenAt: Date.now(),           langue: ['fr', 'pular'] },
        { id: 'a2', prenom: 'Ibrahima',  nomFamille: 'Diallo', status: 'available', currentCallId: null, callStartedAt: null,                  ticketsToday: 8,  lastSeenAt: Date.now() - 180_000, langue: ['fr', 'malinke'] },
        { id: 'a3', prenom: 'Mariama',   nomFamille: 'Camara', status: 'busy',      currentCallId: 'C2', callStartedAt: Date.now() - 230_000,  ticketsToday: 15, lastSeenAt: Date.now(),           langue: ['fr', 'soussou'] },
        { id: 'a4', prenom: 'Mamadou',   nomFamille: 'Sow',    status: 'break',     currentCallId: null, callStartedAt: null,                  ticketsToday: 6,  lastSeenAt: Date.now() - 600_000, langue: ['fr', 'pular'] },
        { id: 'a5', prenom: 'Aissatou',  nomFamille: 'Barry',  status: 'available', currentCallId: null, callStartedAt: null,                  ticketsToday: 9,  lastSeenAt: Date.now(),           langue: ['fr', 'soussou'] },
        { id: 'a6', prenom: 'Sekou',     nomFamille: 'Konaté', status: 'offline',   currentCallId: null, callStartedAt: null,                  ticketsToday: 0,  lastSeenAt: Date.now() - 3600_000, langue: ['fr'] },
      ])

      store.addToQueue({ callId: 'Q1', citizenPhone: '+224620001111', agentId: null, agentName: null, langue: 'pular',   startedAt: Date.now() - 45_000,  status: 'waiting' })
      store.addToQueue({ callId: 'Q2', citizenPhone: '+224620002222', agentId: null, agentName: null, langue: 'fr',      startedAt: Date.now() - 20_000,  status: 'waiting' })
      store.addToQueue({ callId: 'Q3', citizenPhone: '+224620003333', agentId: null, agentName: null, langue: 'malinke', startedAt: Date.now() - 195_000, status: 'waiting' })

      store.promoteToActive('Q1', 'a1', 'Fatoumata Bah')

      store.setKpi({ callsTotal: 127, callsResolved: 104, avgDurationSeconds: 287, resolutionRate: 0.819, peakHour: '10h-11h' })

      store.addAlert({ type: 'warning', message: "Mariama Camara — appel > 4 min (risque SLA)" })
      store.addAlert({ type: 'danger',  message: "File d'attente : 3 appels > 3 min sans agent" })
      store.addAlert({ type: 'info',    message: "Sekou Konaté s'est déconnecté" })

      console.log('[SuperDev] Données de démo chargées')
    },
  }
  console.log('[SuperDev] Commandes: __supDev.seed()')
}
