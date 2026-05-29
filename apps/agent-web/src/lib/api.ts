import { useAgentStore } from '@/stores/agentStore'

const BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAgentStore.getState().accessToken

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    useAgentStore.getState().logout()
    throw new Error('Session expirée')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur serveur' }))
    throw new Error((err as { message: string }).message)
  }

  return res.json()
}

export const api = {
  get:    <T>(path: string)                     => request<T>(path),
  post:   <T>(path: string, body: unknown)      => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)      => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: <T>(path: string)                     => request<T>(path, { method: 'DELETE' }),
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  requestOtp: (telephone: string) =>
    api.post<{ message: string }>('/auth/otp/request', { telephone }),

  verifyOtp: (telephone: string, otp: string) =>
    api.post<{ accessToken: string; refreshToken: string; agent: { id: string; role: string; prenom: string } }>(
      '/auth/otp/verify', { telephone, otp }
    ),
}

// ─── Citizens ────────────────────────────────────────────────────────────────

export const citizenApi = {
  getByPhone: (phone: string) =>
    api.get<{ id: string; prenom?: string; nomFamille?: string; commune?: string; languePreferee: string; tickets: unknown[] }>(`/citizens/${phone}`),

  update: (phone: string, data: Record<string, string>) =>
    api.put(`/citizens/${phone}`, data),
}

// ─── Providers ───────────────────────────────────────────────────────────────

export const providerApi = {
  search: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v))
    })
    return api.get<{ data: unknown[] }>(`/providers?${qs}`)
  },

  updateStatus: (id: string, statut: string) =>
    api.put(`/providers/${id}/status`, { statut }),

  rate: (id: string, body: { note: number; ticketId: string; commentaire?: string }) =>
    api.post(`/providers/${id}/rating`, body),
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const ticketApi = {
  create: (data: Record<string, unknown>) =>
    api.post<{ id: string }>('/tickets', data),

  updateStatus: (id: string, statut: string, extra?: Record<string, unknown>) =>
    api.put(`/tickets/${id}/status`, { statut, ...extra }),

  scheduleCallback: (id: string, scheduledAt: string, notes?: string) =>
    api.post(`/tickets/${id}/callback`, { scheduledAt, notes }),
}

// ─── Places ──────────────────────────────────────────────────────────────────

export const placesApi = {
  search: (q: string, commune?: string) => {
    const qs = new URLSearchParams({ q })
    if (commune) qs.set('commune', commune)
    return api.get<{ data: unknown[] }>(`/places?${qs}`)
  },

  route: (params: { fromLat: number; fromLng: number; toLat: number; toLng: number; mode?: string }) => {
    const qs = new URLSearchParams({
      fromLat: String(params.fromLat),
      fromLng: String(params.fromLng),
      toLat:   String(params.toLat),
      toLng:   String(params.toLng),
      mode:    params.mode ?? 'vehicle',
    })
    return api.get<{ distanceMeters: number; durationSeconds: number; steps: unknown[]; smsText: string }>(`/route?${qs}`)
  },
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

export const smsApi = {
  send: (to: string, message: string) =>
    api.post('/sms/send', { to, message }),
}
