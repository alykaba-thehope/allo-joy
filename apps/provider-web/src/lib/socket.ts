import { useEffect } from 'react'
import { useProviderStore } from '@/stores/providerStore'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connect(token: string) {
  if (ws && ws.readyState <= WebSocket.OPEN) return

  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token}&role=provider`
  ws = new WebSocket(url)

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as { type: string; payload: unknown }
      const store = useProviderStore.getState()

      switch (msg.type) {
        case 'mission:incoming': {
          const p = msg.payload as {
            ticketId: string; categorieService: string; commune: string;
            description: string; citizenPhone: string;
          }
          store.setIncomingRequest({ ...p, receivedAt: Date.now() })
          break
        }
        case 'mission:cancelled':
          if (store.incomingRequest) store.setIncomingRequest(null)
          break
        case 'provider:status_ack':
          break
      }
    } catch { /* ignore malformed */ }
  }

  ws.onclose = () => {
    reconnectTimer = setTimeout(() => connect(token), 3000)
  }
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
}

export function sendStatus(status: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'provider:status', payload: { status } }))
  }
}

export function sendMissionResponse(ticketId: string, accepted: boolean) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'mission:response', payload: { ticketId, accepted } }))
  }
}

export function useSocket(token: string | null) {
  useEffect(() => {
    if (!token) { disconnect(); return }
    connect(token)
    return disconnect
  }, [token])
}
