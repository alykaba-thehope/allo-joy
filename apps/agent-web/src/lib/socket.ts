import { useEffect } from 'react'
import { useCallStore } from '@/stores/callStore'
import type { Citizen } from '@allo-joy/types'

let ws: WebSocket | null = null

export function connectSocket(token: string) {
  if (ws?.readyState === WebSocket.OPEN) return

  ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`)

  ws.onopen = () => {
    console.log('[WS] Connecté')
  }

  ws.onmessage = (event) => {
    const { event: type, data } = JSON.parse(event.data as string) as {
      event: string
      data: Record<string, unknown>
    }

    if (type === 'call:incoming') {
      useCallStore.getState().addToQueue({
        callId:       data.callId as string,
        citizenPhone: data.citizenPhone as string,
        citizen:      (data.citizen as Citizen) ?? null,
      })
    }

    if (type === 'call:ended') {
      useCallStore.getState().removeFromQueue(data.callId as string)
    }
  }

  ws.onclose = () => {
    console.log('[WS] Déconnecté — reconnexion dans 3s')
    setTimeout(() => connectSocket(token), 3000)
  }

  ws.onerror = (e) => console.error('[WS] Erreur:', e)
}

export function disconnectSocket() {
  ws?.close()
  ws = null
}

export function sendSocketMessage(event: string, data: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }))
  }
}

// Hook pour connecter/déconnecter le WS avec le cycle de vie du composant
export function useSocket(token: string | null) {
  useEffect(() => {
    if (!token) return
    connectSocket(token)
    return () => disconnectSocket()
  }, [token])
}
