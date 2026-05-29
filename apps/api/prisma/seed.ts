import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Agents ────────────────────────────────────────────────────────────────
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { telephone: '+224620100001' },
      update: {},
      create: {
        telephone:      '+224620100001',
        prenom:         'Fatoumata',
        nomFamille:     'Diallo',
        role:           'agent',
        languesParlees: ['fr', 'pular'],
        isActive:       true,
      },
    }),
    prisma.agent.upsert({
      where: { telephone: '+224620100002' },
      update: {},
      create: {
        telephone:      '+224620100002',
        prenom:         'Ibrahima',
        nomFamille:     'Camara',
        role:           'agent',
        languesParlees: ['fr', 'soussou', 'malinke'],
        isActive:       true,
      },
    }),
    prisma.agent.upsert({
      where: { telephone: '+224620100010' },
      update: {},
      create: {
        telephone:      '+224620100010',
        prenom:         'Aissatou',
        nomFamille:     'Bah',
        role:           'superviseur',
        languesParlees: ['fr', 'pular'],
        isActive:       true,
      },
    }),
    prisma.agent.upsert({
      where: { telephone: '+224620100020' },
      update: {},
      create: {
        telephone:      '+224620100020',
        prenom:         'Admin',
        nomFamille:     'AlloJoy',
        role:           'admin',
        languesParlees: ['fr'],
        isActive:       true,
      },
    }),
  ])
  console.log(`✓ ${agents.length} agents`)

  // ── Prestataires ──────────────────────────────────────────────────────────
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { telephonePrincipal: '+224621001001' },
      update: {},
      create: {
        nomComplet:             'Ousmane Baldé',
        telephonePrincipal:     '+224621001001',
        categoriePrincipale:    'plomberie',
        sousCategories:         ['robinetterie', 'canalisation', 'chauffe-eau'],
        communesIntervention:   ['Ratoma', 'Matoto', 'Dixinn'],
        languesParlees:         ['fr', 'pular'],
        noteMoyenne:            4.7,
        nbMissionsTotales:      148,
        nbMissionsReussies:     136,
        tauxReactivite:         0.92,
        statut:                 'DISPONIBLE',
        abonnementTier:         'ARGENT',
        dateExpirationAbonnement: new Date('2025-12-31'),
      },
    }),
    prisma.provider.upsert({
      where: { telephonePrincipal: '+224621001002' },
      update: {},
      create: {
        nomComplet:             'Mamadou Kouyaté',
        telephonePrincipal:     '+224621001002',
        categoriePrincipale:    'electricite',
        sousCategories:         ['installation', 'depannage', 'tableau-electrique'],
        communesIntervention:   ['Kaloum', 'Matam', 'Dixinn'],
        languesParlees:         ['fr', 'malinke'],
        noteMoyenne:            4.5,
        nbMissionsTotales:      89,
        nbMissionsReussies:     82,
        tauxReactivite:         0.88,
        statut:                 'DISPONIBLE',
        abonnementTier:         'BRONZE',
        dateExpirationAbonnement: new Date('2025-09-30'),
      },
    }),
    prisma.provider.upsert({
      where: { telephonePrincipal: '+224621001003' },
      update: {},
      create: {
        nomComplet:             'Aminata Soumah',
        telephonePrincipal:     '+224621001003',
        categoriePrincipale:    'menage',
        sousCategories:         ['nettoyage', 'repassage', 'cuisine'],
        communesIntervention:   ['Ratoma', 'Matoto', 'Matam', 'Dixinn', 'Kaloum'],
        languesParlees:         ['fr', 'soussou'],
        noteMoyenne:            4.9,
        nbMissionsTotales:      203,
        nbMissionsReussies:     198,
        tauxReactivite:         0.97,
        statut:                 'DISPONIBLE',
        abonnementTier:         'OR',
        dateExpirationAbonnement: new Date('2026-06-30'),
      },
    }),
    prisma.provider.upsert({
      where: { telephonePrincipal: '+224621001004' },
      update: {},
      create: {
        nomComplet:             'Sekou Traoré',
        telephonePrincipal:     '+224621001004',
        categoriePrincipale:    'transport',
        sousCategories:         ['taxi', 'livraison', 'demenagement'],
        communesIntervention:   ['Ratoma', 'Matoto', 'Matam', 'Dixinn', 'Kaloum'],
        languesParlees:         ['fr', 'malinke', 'pular'],
        noteMoyenne:            4.3,
        nbMissionsTotales:      312,
        nbMissionsReussies:     278,
        tauxReactivite:         0.85,
        statut:                 'OCCUPE',
        abonnementTier:         'ARGENT',
        dateExpirationAbonnement: new Date('2025-11-30'),
      },
    }),
    prisma.provider.upsert({
      where: { telephonePrincipal: '+224621001005' },
      update: {},
      create: {
        nomComplet:             'Mariama Diallo',
        telephonePrincipal:     '+224621001005',
        categoriePrincipale:    'plomberie',
        sousCategories:         ['tuyauterie', 'sanitaire'],
        communesIntervention:   ['Matoto', 'Kaloum'],
        languesParlees:         ['fr', 'pular'],
        noteMoyenne:            4.1,
        nbMissionsTotales:      67,
        nbMissionsReussies:     59,
        tauxReactivite:         0.79,
        statut:                 'HORS_LIGNE',
        abonnementTier:         'GRATUIT',
        dateExpirationAbonnement: null,
      },
    }),
  ])
  console.log(`✓ ${providers.length} prestataires`)

  // ── Repères géographiques (lieux clés Conakry) ────────────────────────────
  const places = await Promise.all([
    prisma.place.upsert({
      where: { id: 'place-marche-madina' },
      update: {},
      create: {
        id:              'place-marche-madina',
        nomOfficiel:     'Marché de Madina',
        nomLocal:        'Madina',
        commune:         'Matoto',
        quartier:        'Madina',
        precisionMetres: 50,
        typeLieu:        'COMMERCE',
        repereProximite: ['Grand carrefour', 'Mosquée centrale'],
        isVerified:      true,
      },
    }),
    prisma.place.upsert({
      where: { id: 'place-chu-ignace-deen' },
      update: {},
      create: {
        id:              'place-chu-ignace-deen',
        nomOfficiel:     'CHU Ignace Deen',
        nomLocal:        'Hôpital Ignace Deen',
        commune:         'Kaloum',
        quartier:        'Almamya',
        precisionMetres: 20,
        typeLieu:        'SANTE',
        repereProximite: ['Port de Conakry', 'Palais du peuple'],
        isVerified:      true,
      },
    }),
    prisma.place.upsert({
      where: { id: 'place-aeroport' },
      update: {},
      create: {
        id:              'place-aeroport',
        nomOfficiel:     'Aéroport International de Conakry',
        nomLocal:        'Aéroport Gbéssia',
        nomPular:        'Aéroport Gbéssia',
        commune:         'Matoto',
        quartier:        'Gbéssia',
        precisionMetres: 30,
        typeLieu:        'TRANSPORT',
        repereProximite: ['Route principale Coyah'],
        isVerified:      true,
      },
    }),
  ])
  console.log(`✓ ${places.length} repères géographiques`)

  console.log('\n✅ Seed terminé!')
  console.log('\nComptes de test:')
  console.log('  Agent:        +224620100001 (code OTP simulé: 123456)')
  console.log('  Superviseur:  +224620100010')
  console.log('  Prestataire:  +224621001001 (Ousmane Baldé — plomberie)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
