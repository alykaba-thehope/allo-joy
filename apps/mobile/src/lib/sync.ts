import NetInfo from '@react-native-community/netinfo'
import { tickets as ticketsApi, categories as categoriesApi } from './api'
import {
  getPendingTickets,
  markTicketSynced,
  markTicketSyncError,
  upsertCategories,
  getSetting,
  setSetting,
  upsertTicket,
  getAllTickets,
} from './db'

let _syncing = false

export async function syncPendingTickets(): Promise<{ synced: number; errors: number }> {
  if (_syncing) return { synced: 0, errors: 0 }
  _syncing = true

  const pending = getPendingTickets()
  let synced = 0
  let errors = 0

  for (const t of pending) {
    try {
      const created = await ticketsApi.create({
        categorieId: t.categorie_id,
        commune: t.commune,
        description: t.description,
        latitude: t.latitude ?? undefined,
        longitude: t.longitude ?? undefined,
        adresse: t.adresse ?? undefined,
      })
      markTicketSynced(t.local_id!, created.id)
      synced++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      markTicketSyncError(t.local_id!, msg)
      errors++
    }
  }

  _syncing = false
  return { synced, errors }
}

export async function syncCategories(): Promise<void> {
  const lastSync = parseInt(getSetting('categories_synced_at') ?? '0', 10)
  // Re-sync toutes les 24h
  if (Date.now() - lastSync < 86_400_000) return

  try {
    const cats = await categoriesApi.list()
    upsertCategories(cats.map(c => ({
      id: c.id,
      nom: c.nom,
      icone: c.icone,
      updated_at: new Date(c.updatedAt).getTime(),
    })))
    setSetting('categories_synced_at', String(Date.now()))
  } catch {
    // Pas de connexion — on utilise le cache local
  }
}

export async function syncServerTickets(): Promise<void> {
  try {
    const { data } = await ticketsApi.list(1)
    const now = Date.now()
    for (const t of data) {
      upsertTicket({
        id: t.id,
        local_id: null,
        statut: t.statut,
        categorie_id: t.categorieService,
        categorie_nom: t.categorieService,
        commune: t.commune,
        description: t.description,
        latitude: null,
        longitude: null,
        adresse: null,
        created_at: new Date(t.createdAt).getTime(),
        updated_at: new Date(t.updatedAt).getTime(),
        synced: 1,
        sync_error: null,
      })
    }
    setSetting('tickets_synced_at', String(now))
  } catch {
    // Offline — données locales déjà disponibles
  }
}

export async function fullSync(): Promise<void> {
  const state = await NetInfo.fetch()
  if (!state.isConnected) return

  await Promise.all([
    syncCategories(),
    syncPendingTickets(),
    syncServerTickets(),
  ])
}
