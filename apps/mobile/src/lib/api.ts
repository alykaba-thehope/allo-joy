import Constants from 'expo-constants'
import { getCitizen, saveCitizen } from './db'

const BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:3000'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function refreshTokens(): Promise<string | null> {
  const citizen = getCitizen()
  if (!citizen?.refresh_token) return null

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: citizen.refresh_token }),
  })
  if (!res.ok) return null

  const data = (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number }
  saveCitizen({
    ...citizen,
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
    token_expires: Date.now() + data.expiresIn * 1000,
  })
  return data.accessToken
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts

  let token: string | null = null
  if (auth) {
    const citizen = getCitizen()
    token = citizen?.access_token ?? null

    // Refresh si expiré (avec marge de 60s)
    if (citizen?.token_expires && citizen.token_expires - 60_000 < Date.now()) {
      token = await refreshTokens()
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, msg)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────

export const auth = {
  requestOtp: (telephone: string) =>
    request<{ message: string }>('/api/auth/otp/request', {
      method: 'POST',
      body: { telephone, role: 'citoyen' },
      auth: false,
    }),

  verifyOtp: (telephone: string, code: string) =>
    request<{
      accessToken: string
      refreshToken: string
      expiresIn: number
      id: string
      prenom: string | null
      nomFamille: string | null
    }>('/api/auth/otp/verify', {
      method: 'POST',
      body: { telephone, code, role: 'citoyen' },
      auth: false,
    }),
}

// ── Tickets ───────────────────────────────────────────────────────────────

export type TicketPayload = {
  categorieId: string
  commune: string
  description: string
  latitude?: number
  longitude?: number
  adresse?: string
}

export type TicketResponse = {
  id: string
  statut: string
  categorieService: string
  commune: string
  description: string
  createdAt: string
  updatedAt: string
}

export const tickets = {
  create: (payload: TicketPayload) =>
    request<TicketResponse>('/api/tickets', { method: 'POST', body: payload }),

  list: (page = 1) =>
    request<{ data: TicketResponse[]; total: number; page: number }>(`/api/tickets?page=${page}`),

  get: (id: string) =>
    request<TicketResponse & { agent?: { prenom: string }; provider?: { prenom: string; telephone: string } }>(
      `/api/tickets/${id}`
    ),
}

// ── Categories ─────────────────────────────────────────────────────────────

export type CategoryResponse = { id: string; nom: string; icone: string; updatedAt: string }

export const categories = {
  list: () => request<CategoryResponse[]>('/api/categories', { auth: false }),
}

// ── Providers ─────────────────────────────────────────────────────────────

export type ProviderResponse = {
  id: string
  prenom: string
  nomFamille: string
  categorieService: string
  noteMoyenne: number
  commune: string
  distanceKm?: number
}

export const providers = {
  nearby: (lat: number, lng: number, categorie?: string) => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), limit: '10' })
    if (categorie) params.set('categorie', categorie)
    return request<ProviderResponse[]>(`/api/providers?${params}`, { auth: false })
  },
}
