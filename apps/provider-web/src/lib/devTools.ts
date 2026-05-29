import { useProviderStore } from '@/stores/providerStore'

if (import.meta.env.DEV) {
  ;(window as any).__provDev = {
    seed: () => {
      const store = useProviderStore.getState()
      store.setAuth({
        accessToken:      'dev-token',
        prenom:           'Ousmane',
        nomFamille:       'Baldé',
        telephone:        '+224621001122',
        categorieService: 'plomberie',
        langues:          ['fr', 'pular'],
        noteMoyenne:      4.7,
        tauxReussite:     0.92,
        totalMissions:    148,
      })
      store.setMissionsToday(3)
      store.setMissions([
        { id: 'M1', categorieService: 'plomberie',   commune: 'Ratoma',  description: 'Fuite sous évier cuisine',         citizenPhone: '+224620111222', assignedAt: Date.now() - 7200_000,  completedAt: Date.now() - 5400_000, status: 'termine', noteRecue: 5 },
        { id: 'M2', categorieService: 'plomberie',   commune: 'Matoto',  description: 'Robinet cassé salle de bain',      citizenPhone: '+224620333444', assignedAt: Date.now() - 86400_000, completedAt: Date.now() - 82800_000, status: 'termine', noteRecue: 4 },
        { id: 'M3', categorieService: 'plomberie',   commune: 'Dixinn',  description: 'Tuyau bouché WC',                 citizenPhone: '+224620555666', assignedAt: Date.now() - 172800_000, completedAt: Date.now() - 169200_000, status: 'termine', noteRecue: 5 },
        { id: 'M4', categorieService: 'plomberie',   commune: 'Kaloum',  description: 'Réparation chauffe-eau',          citizenPhone: '+224620777888', assignedAt: Date.now() - 259200_000, completedAt: null,               status: 'annule',  noteRecue: null },
        { id: 'M5', categorieService: 'plomberie',   commune: 'Matam',   description: 'Installation robinet mitigeur',   citizenPhone: '+224620999000', assignedAt: Date.now() - 345600_000, completedAt: Date.now() - 340000_000, status: 'termine', noteRecue: 4 },
      ])
      console.log('[ProvDev] Données de démo chargées')
    },

    simulateIncoming: () => {
      const store = useProviderStore.getState()
      store.setIncomingRequest({
        ticketId:         'T-demo',
        categorieService: 'plomberie',
        commune:          'Ratoma',
        description:      'Fuite importante au niveau du tuyau principal — eau qui coule depuis 2h',
        citizenPhone:     '+224620123456',
        receivedAt:       Date.now(),
      })
      console.log('[ProvDev] Mission entrante simulée')
    },

    clearIncoming: () => {
      useProviderStore.getState().setIncomingRequest(null)
      console.log('[ProvDev] Mission entrante effacée')
    },
  }
  console.log('[ProvDev] Commandes: __provDev.seed() | __provDev.simulateIncoming()')
}
