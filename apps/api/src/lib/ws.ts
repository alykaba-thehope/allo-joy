/**
 * WebSocket connection registry.
 * Sockets are registered on connect with their role + user ID,
 * allowing role-targeted broadcasts and per-user sends.
 */

// Use the built-in WebSocket interface (available in lib ES2022 + DOM)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSocket = any

export type WsRole = 'agent' | 'superviseur' | 'prestataire'

interface WsClient {
  socket:  WebSocket
  role:    WsRole
  userId:  string
}

// Module-level registry — one entry per connected socket
const registry = new Map<WebSocket, WsClient>()

export function register(socket: WebSocket, role: WsRole, userId: string): void {
  registry.set(socket, { socket, role, userId })
}

export function unregister(socket: WebSocket): void {
  registry.delete(socket)
}

export function broadcast(event: string, payload: unknown, targetRole?: WsRole): void {
  const msg = JSON.stringify({ type: event, payload })
  for (const client of registry.values()) {
    if (targetRole && client.role !== targetRole) continue
    if (client.socket.readyState === 1 /* OPEN */) {
      client.socket.send(msg)
    }
  }
}

export function sendToUser(userId: string, event: string, payload: unknown): void {
  const msg = JSON.stringify({ type: event, payload })
  for (const client of registry.values()) {
    if (client.userId === userId && client.socket.readyState === 1) {
      client.socket.send(msg)
    }
  }
}

export function connectedCount(role?: WsRole): number {
  if (!role) return registry.size
  let count = 0
  for (const c of registry.values()) if (c.role === role) count++
  return count
}
