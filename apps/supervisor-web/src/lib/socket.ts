import { useEffect } from 'react'
import { useSupervisorStore } from '@/stores/supervisorStore'

let ws: WebSocket | null = null

export function connectSocket(token: string) {
  if (ws?.readyState === WebSocket.OPEN) return

  ws = new WebSocket(`ws://localhost:3000/ws?token=${token}&role=superviseur`)

  ws.onopen = () => console.log('[Supervisor WS] Connecté')

  ws.onmessage = (event) => {
    const { event: type, data } = JSON.parse(event.data as string) as {
      event: string
      data: Record<string, unknown>
    }
    const store = useSupervisorStore.getState()

    switch (type) {
      case 'call:incoming':
        store.addToQueue({
          callId:       data.callId as string,
          citizenPhone: data.citizenPhone as string,
          agentId:      null,
          agentName:    null,
          langue:       (data.langue as string) ?? 'fr',
          startedAt:    Date.now(),
          status:       'waiting',
        })
        if (store.queue.length >= 5) {
          store.addAlert({ type: 'warning', message: `File d'attente : ${store.queue.length + 1} appels en attente` })
        }
        break

      case 'call:accepted':
        store.promoteToActive(data.callId as string, data.agentId as string, data.agentName as string)
        break

      case 'call:ended':
        useSupervisorStore.setState((s) => ({
          activeCalls: s.activeCalls.filter((c) => c.callId !== data.callId),
        }))
        break

      case 'agent:status':
        store.updateAgentStatus(data.agentId as string, data.status as 'available' | 'busy' | 'break' | 'offline')
        if (data.status === 'offline') {
          store.addAlert({ type: 'info', message: `Agent ${data.agentName ?? data.agentId} s'est déconnecté` })
        }
        break
    }
  }

  ws.onclose = () => {
    console.log('[Supervisor WS] Déconnecté — reconnexion dans 3s')
    setTimeout(() => connectSocket(token), 3000)
  }
}

export function useSocket(token: string | null) {
  useEffect(() => {
    if (!token) return
    connectSocket(token)
  }, [token])
}
