// Asterisk ARI (Asterisk REST Interface) — WebSocket client
// Gère les événements d'appels en temps réel et les bridge avec le WS AlloJoy

import { broadcast, sendToUser } from '@/lib/ws'
import prisma from '@/lib/prisma'

const ARI_URL  = () => process.env.ASTERISK_ARI_URL  ?? 'ws://asterisk:8088'
const ARI_APP  = 'allojoy-ari'
const ARI_USER = () => process.env.ASTERISK_ARI_USER ?? 'allojoy'
const ARI_PASS = () => process.env.ASTERISK_ARI_PASSWORD ?? ''

type AriEvent = {
  type: string
  asterisk_id?: string
  timestamp?: string
  channel?: {
    id: string
    name: string
    state: string
    caller: { name: string; number: string }
    dialplan: { context: string; exten: string; priority: number }
    creationtime: string
  }
  bridge?: {
    id: string
    bridge_type: string
    channels: string[]
  }
  recording?: { name: string; target_uri: string; state: string }
  peer_channel?: { id: string; name: string; caller: { number: string } }
}

let _ws: WebSocket | null = null
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
let _started = false

// Suivi des appels actifs en mémoire : channelId → callInfo
const activeCalls = new Map<string, {
  callId: string
  citizenPhone: string
  agentChannel?: string
  startedAt: Date
}>()

export function startAriClient(): void {
  if (_started) return
  _started = true
  connect()
}

function connect(): void {
  const wsUrl = `${ARI_URL()}/asterisk/ws?app=${ARI_APP}&api_key=${ARI_USER()}:${ARI_PASS()}`

  try {
    _ws = new (require('ws'))( wsUrl) as WebSocket

    _ws.onopen = () => {
      console.log('[ARI] Connecté à Asterisk')
      if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
    }

    _ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as AriEvent
        handleEvent(data)
      } catch { /* ignorer les messages malformés */ }
    }

    _ws.onclose = () => {
      console.warn('[ARI] Déconnecté — reconnexion dans 5s')
      scheduleReconnect()
    }

    _ws.onerror = (err: Event) => {
      console.error('[ARI] Erreur WebSocket:', err)
    }
  } catch (err) {
    console.error('[ARI] Impossible de créer le WebSocket:', err)
    scheduleReconnect()
  }
}

function scheduleReconnect(): void {
  if (!_reconnectTimer) {
    _reconnectTimer = setTimeout(() => { _reconnectTimer = null; connect() }, 5_000)
  }
}

async function handleEvent(event: AriEvent): Promise<void> {
  switch (event.type) {

    case 'StasisStart': {
      // Nouvel appel entrant dans l'app ARI
      const ch = event.channel!
      const phone = ch.caller.number
      activeCalls.set(ch.id, { callId: ch.id, citizenPhone: phone, startedAt: new Date(ch.creationtime) })

      const citizen = await prisma.citizen.findUnique({
        where: { telephone: phone },
        include: { tickets: { orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, categorieService: true, statut: true } } },
      }).catch(() => null)

      broadcast('call:incoming', {
        channelId:    ch.id,
        citizenPhone: phone,
        citizen,
      }, 'agent')

      broadcast('call:incoming', { channelId: ch.id, citizenPhone: phone }, 'superviseur')
      break
    }

    case 'StasisEnd': {
      const ch = event.channel!
      const info = activeCalls.get(ch.id)
      if (!info) break

      const duration = Math.round((Date.now() - info.startedAt.getTime()) / 1000)
      activeCalls.delete(ch.id)

      broadcast('call:ended', { channelId: ch.id, dureeSecondes: duration }, 'superviseur')
      break
    }

    case 'ChannelStateChange': {
      const ch = event.channel!
      broadcast('call:state', { channelId: ch.id, state: ch.state }, 'superviseur')
      break
    }

    case 'BridgeCreated':
      // Agents et citoyen bridgés — l'appel est décroché
      broadcast('call:answered', {
        bridgeId:  event.bridge!.id,
        channels:  event.bridge!.channels,
      }, 'superviseur')
      break

    case 'RecordingStarted':
      // Enregistrement actif
      break

    case 'RecordingFinished': {
      const rec = event.recording!
      if (rec.target_uri) {
        // Mettre à jour la DB avec l'URL d'enregistrement
        const channelId = rec.target_uri.split('/').pop()
        if (channelId) {
          await prisma.call.updateMany({
            where:  { externalId: channelId },
            data:   { recordingUrl: rec.name },
          }).catch(() => {})
        }
      }
      break
    }
  }
}

// ── API HTTP ARI (actions) ────────────────────────────────────────────────────

async function ariPost(path: string, body?: unknown) {
  const url = `${ARI_URL().replace('ws://', 'http://').replace('wss://', 'https://')}/asterisk${path}`
  const credentials = Buffer.from(`${ARI_USER()}:${ARI_PASS()}`).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`ARI ${res.status}: ${await res.text()}`)
  return res.json().catch(() => null)
}

// Raccrocher un canal (ex: appel fantôme)
export async function hangupChannel(channelId: string): Promise<void> {
  await ariPost(`/channels/${channelId}`, { reason: 'normal' })
}

// Originate — rappel sortant vers un citoyen
export async function originateCallback(citizenPhone: string, agentChannel: string): Promise<void> {
  await ariPost('/channels', {
    endpoint:  `PJSIP/${citizenPhone}@trunk_operator_endpoint`,
    app:        ARI_APP,
    appArgs:   `callback,${agentChannel}`,
    callerId:   'AlloJoy <3030>',
  })
}
