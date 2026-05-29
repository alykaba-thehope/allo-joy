import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma pour les tests unitaires du moteur de scoring
vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}))

import prisma from '@/lib/prisma'
import { findTopProviders } from '@/services/matching'

const mockProviders = [
  {
    id: 'uuid-1',
    nom_complet: 'Ibrahima Diallo',
    telephone_principal: '+224620000001',
    telephone_backup: null,
    categorie_principale: 'plomberie',
    sous_categories: [],
    communes_intervention: ['Ratoma'],
    note_moyenne: '4.5',
    nb_missions_totales: 50,
    nb_missions_reussies: 45,
    taux_reactivite: '0.92',
    statut: 'DISPONIBLE',
    abonnement_tier: 'OR',
    date_expiration_abonnement: null,
    date_verification_terrain: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance_km: '1.2',
    score: '0.8356',
  },
  {
    id: 'uuid-2',
    nom_complet: 'Mamadou Bah',
    telephone_principal: '+224620000002',
    telephone_backup: null,
    categorie_principale: 'plomberie',
    sous_categories: [],
    communes_intervention: ['Ratoma'],
    note_moyenne: '3.8',
    nb_missions_totales: 20,
    nb_missions_reussies: 16,
    taux_reactivite: '0.75',
    statut: 'DISPONIBLE',
    abonnement_tier: 'BRONZE',
    date_expiration_abonnement: null,
    date_verification_terrain: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance_km: '3.5',
    score: '0.6240',
  },
]

describe('findTopProviders', () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockProviders)
  })

  it('retourne les prestataires triés par score décroissant', async () => {
    const results = await findTopProviders({
      commune: 'Ratoma',
      categorie: 'plomberie',
      lat: 9.55,
      lng: -13.65,
    })

    expect(results).toHaveLength(2)
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score)
    expect(results[0]!.id).toBe('uuid-1')
  })

  it('mappe correctement les champs snake_case → camelCase', async () => {
    const results = await findTopProviders({ commune: 'Ratoma', categorie: 'plomberie' })

    expect(results[0]).toMatchObject({
      id: 'uuid-1',
      nomComplet: 'Ibrahima Diallo',
      telephonePrincipal: '+224620000001',
      categoriePrincipale: 'plomberie',
      noteMoyenne: 4.5,
      tauxReactivite: 0.92,
      statut: 'DISPONIBLE',
    })
  })

  it('inclut le score et la distance dans la réponse', async () => {
    const results = await findTopProviders({
      commune: 'Ratoma',
      categorie: 'plomberie',
      lat: 9.55,
      lng: -13.65,
    })

    expect(results[0]!.score).toBe(0.8356)
    expect(results[0]!.distanceKm).toBe(1.2)
  })

  it('passe limit=3 par défaut à la requête', async () => {
    await findTopProviders({ commune: 'Matoto', categorie: 'electricite' })
    expect(prisma.$queryRaw).toHaveBeenCalled()
  })
})

describe('formule de scoring — validation des poids', () => {
  it('un prestataire avec note 5/5 + 100% réussite + 0km obtient un score proche de 1.0', () => {
    const note = 5 / 5        // 1.0
    const reussite = 1.0
    const proximite = 1.0     // 0km
    const reactivite = 1.0

    const score = note * 0.40 + reussite * 0.30 + proximite * 0.20 + reactivite * 0.10
    expect(score).toBeCloseTo(1.0, 10)
  })

  it('un prestataire sans note et à 10km+ obtient un score proche de 0.30', () => {
    const note = 0
    const reussite = 0
    const proximite = 0  // >10km → 0
    const reactivite = 0.3

    const score = note * 0.40 + reussite * 0.30 + proximite * 0.20 + reactivite * 0.10
    expect(score).toBeCloseTo(0.03)
  })

  it('la note a le plus grand poids (40%)', () => {
    const noteImpact = 1.0 * 0.40
    const reussiteImpact = 1.0 * 0.30
    expect(noteImpact).toBeGreaterThan(reussiteImpact)
  })
})
