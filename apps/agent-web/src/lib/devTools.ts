import { useCallStore } from '@/stores/callStore'
import { useAgentStore } from '@/stores/agentStore'

// Exposé uniquement en développement pour les tests
if (import.meta.env.DEV) {
  ;(window as any).__alloJoy = {
    simulateCall: (phone = '+224620001234') => {
      useCallStore.getState().acceptCall({
        callId: `CALL-${Date.now()}`,
        citizenPhone: phone,
        citizen: {
          id: 'cit-preview',
          telephone: phone,
          prenom: 'Mamadou',
          nomFamille: 'Diallo',
          commune: 'Ratoma' as any,
          languePreferee: 'pular' as any,
          notes: 'Client fidèle, demande souvent des plombiers.',
          nbDemandesTotales: 7,
          tickets: [
            { id: 'tk-1', categorieService: 'plomberie',   statut: 'RESOLU',  createdAt: '2025-03-10T09:00:00Z' },
            { id: 'tk-2', categorieService: 'electricite', statut: 'CLOTURE', createdAt: '2025-01-22T14:30:00Z' },
            { id: 'tk-3', categorieService: 'transport',   statut: 'RESOLU',  createdAt: '2024-11-05T11:00:00Z' },
          ],
          createdAt: '2024-10-01T00:00:00Z',
          updatedAt: '2025-03-10T09:00:00Z',
        },
      })
      useAgentStore.getState().setStatus('busy')
      console.log('[Dev] Appel simulé depuis', phone)
    },

    simulateProviders: () => {
      useCallStore.getState().setProviders([
        {
          id: 'prov-1', nomComplet: 'Ibrahima Diallo', telephonePrincipal: '+224620000001',
          categoriePrincipale: 'plomberie', sousCategories: [], communesIntervention: ['Ratoma' as any],
          noteMoyenne: 4.5, nbMissionsTotales: 52, nbMissionsReussies: 48, tauxReactivite: 0.92,
          statut: 'DISPONIBLE', abonnementTier: 'OR', score: 0.84, distanceKm: 1.2,
          createdAt: '', updatedAt: '',
        },
        {
          id: 'prov-2', nomComplet: 'Mamadou Bah', telephonePrincipal: '+224620000002',
          categoriePrincipale: 'plomberie', sousCategories: [], communesIntervention: ['Ratoma' as any],
          noteMoyenne: 3.8, nbMissionsTotales: 20, nbMissionsReussies: 16, tauxReactivite: 0.75,
          statut: 'DISPONIBLE', abonnementTier: 'BRONZE', score: 0.62, distanceKm: 3.5,
          createdAt: '', updatedAt: '',
        },
        {
          id: 'prov-3', nomComplet: 'Alpha Camara', telephonePrincipal: '+224620000003',
          categoriePrincipale: 'plomberie', sousCategories: [], communesIntervention: ['Ratoma' as any],
          noteMoyenne: 4.1, nbMissionsTotales: 35, nbMissionsReussies: 31, tauxReactivite: 0.83,
          statut: 'DISPONIBLE', abonnementTier: 'ARGENT', score: 0.71, distanceKm: 2.1,
          createdAt: '', updatedAt: '',
        },
      ])
    },

    endCall: () => {
      useCallStore.getState().endCall()
      useAgentStore.getState().setStatus('available')
    },
  }

  console.log('[AlloJoy Dev] Commandes disponibles:\n  __alloJoy.simulateCall()\n  __alloJoy.simulateProviders()\n  __alloJoy.endCall()')
}
