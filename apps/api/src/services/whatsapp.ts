// Client Meta WhatsApp Business Cloud API v20

const WA_API_VERSION = 'v20.0'
const BASE = `https://graph.facebook.com/${WA_API_VERSION}`

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN ?? ''}`,
  }
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API ${res.status}: ${err}`)
  }
  return res.json()
}

const PHONE_ID = () => process.env.WHATSAPP_PHONE_ID ?? ''

// ── Texte simple ──────────────────────────────────────────────────────────────
export async function sendText(to: string, text: string) {
  return post(`/${PHONE_ID()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text, preview_url: false },
  })
}

// ── Boutons de réponse rapide (max 3) ─────────────────────────────────────────
export async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  return post(`/${PHONE_ID()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  })
}

// ── Liste de sélection (max 10 items) ─────────────────────────────────────────
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
) {
  return post(`/${PHONE_ID()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: { button: buttonLabel, sections },
    },
  })
}

// ── Marquer comme lu ──────────────────────────────────────────────────────────
export async function markRead(messageId: string) {
  return post(`/${PHONE_ID()}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}

// ── Types du payload entrant Meta ─────────────────────────────────────────────
export type WaMessage = {
  id: string
  from: string // phone E.164 sans +
  type: 'text' | 'interactive' | 'button' | 'image' | 'audio' | 'document'
  text?: { body: string }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string }
  }
  button?: { payload: string; text: string }
  timestamp: string
}

export type WaWebhookBody = {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      field: string
      value: {
        messaging_product: string
        metadata: { phone_number_id: string; display_phone_number: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: WaMessage[]
        statuses?: Array<{ id: string; status: string; timestamp: string }>
      }
    }>
  }>
}

export function extractMessages(body: WaWebhookBody): WaMessage[] {
  return body.entry
    .flatMap(e => e.changes)
    .filter(c => c.field === 'messages')
    .flatMap(c => c.value.messages ?? [])
}

export function getReplyId(msg: WaMessage): string | null {
  if (msg.type === 'interactive') {
    return msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id ?? null
  }
  if (msg.type === 'button') return msg.button?.payload ?? null
  return null
}

export function getTextBody(msg: WaMessage): string {
  return msg.text?.body?.trim() ?? ''
}
