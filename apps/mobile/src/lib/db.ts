import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('allojoy.db')
  return _db
}

export async function initDb(): Promise<void> {
  const db = getDb()

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      nom        TEXT NOT NULL,
      icone      TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id              TEXT PRIMARY KEY,
      local_id        TEXT UNIQUE,
      statut          TEXT NOT NULL DEFAULT 'OUVERT',
      categorie_id    TEXT NOT NULL,
      categorie_nom   TEXT NOT NULL,
      commune         TEXT NOT NULL,
      description     TEXT NOT NULL,
      latitude        REAL,
      longitude       REAL,
      adresse         TEXT,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      synced          INTEGER NOT NULL DEFAULT 0,
      sync_error      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tickets_synced  ON tickets(synced);

    CREATE TABLE IF NOT EXISTS citizen (
      id              TEXT PRIMARY KEY,
      telephone       TEXT NOT NULL,
      prenom          TEXT,
      nom_famille     TEXT,
      access_token    TEXT,
      refresh_token   TEXT,
      token_expires   INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

// ── Citizen (une seule ligne) ──────────────────────────────────────────────

export type DbCitizen = {
  id: string
  telephone: string
  prenom: string | null
  nom_famille: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires: number | null
}

export function saveCitizen(c: DbCitizen): void {
  const db = getDb()
  db.runSync(
    `INSERT OR REPLACE INTO citizen
       (id, telephone, prenom, nom_famille, access_token, refresh_token, token_expires)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.id, c.telephone, c.prenom, c.nom_famille, c.access_token, c.refresh_token, c.token_expires]
  )
}

export function getCitizen(): DbCitizen | null {
  return getDb().getFirstSync<DbCitizen>('SELECT * FROM citizen LIMIT 1')
}

export function clearCitizen(): void {
  getDb().runSync('DELETE FROM citizen')
}

// ── Tickets ───────────────────────────────────────────────────────────────

export type DbTicket = {
  id: string
  local_id: string | null
  statut: string
  categorie_id: string
  categorie_nom: string
  commune: string
  description: string
  latitude: number | null
  longitude: number | null
  adresse: string | null
  created_at: number
  updated_at: number
  synced: number
  sync_error: string | null
}

export function upsertTicket(t: DbTicket): void {
  const db = getDb()
  db.runSync(
    `INSERT OR REPLACE INTO tickets
       (id, local_id, statut, categorie_id, categorie_nom, commune, description,
        latitude, longitude, adresse, created_at, updated_at, synced, sync_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id, t.local_id, t.statut, t.categorie_id, t.categorie_nom,
      t.commune, t.description, t.latitude, t.longitude, t.adresse,
      t.created_at, t.updated_at, t.synced, t.sync_error,
    ]
  )
}

export function getAllTickets(): DbTicket[] {
  return getDb().getAllSync<DbTicket>('SELECT * FROM tickets ORDER BY created_at DESC')
}

export function getPendingTickets(): DbTicket[] {
  return getDb().getAllSync<DbTicket>('SELECT * FROM tickets WHERE synced = 0')
}

export function markTicketSynced(localId: string, serverId: string): void {
  getDb().runSync(
    'UPDATE tickets SET id = ?, synced = 1, sync_error = NULL WHERE local_id = ?',
    [serverId, localId]
  )
}

export function markTicketSyncError(localId: string, error: string): void {
  getDb().runSync(
    'UPDATE tickets SET sync_error = ? WHERE local_id = ?',
    [error, localId]
  )
}

// ── Categories ─────────────────────────────────────────────────────────────

export type DbCategory = { id: string; nom: string; icone: string; updated_at: number }

export function upsertCategories(cats: DbCategory[]): void {
  const db = getDb()
  for (const c of cats) {
    db.runSync(
      'INSERT OR REPLACE INTO categories (id, nom, icone, updated_at) VALUES (?, ?, ?, ?)',
      [c.id, c.nom, c.icone, c.updated_at]
    )
  }
}

export function getCategories(): DbCategory[] {
  return getDb().getAllSync<DbCategory>('SELECT * FROM categories ORDER BY nom')
}

// ── Settings ───────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
}
