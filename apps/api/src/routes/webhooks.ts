import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { broadcast } from '@/lib/ws'
import { extractMessages, markRead, type WaWebhookBody } from '@/services/whatsapp'
import { handleWhatsAppMessage } from '@/services/whatsapp-bot'

// ── Schemas Asterisk ──────────────────────────────────────────────────────────

const callStartedSchema = z.object({
  callId:     z.string(),
  citizenPhone: z.string(),
  operateur:  z.string().optional(),
  langue:     z.enum(['fr', 'pular', 'malinke', 'soussou']).optional(),
  startedAt:  z.string().datetime(),
})

const callEndedSchema = z.object({
  callId:          z.string(),
  dureeSecondes:   z.number().int().nonnegative(),
  recordingUrl:    z.string().url().optional(),
  agentId:         z.string().uuid().optional(),
})

const ussdSessionSchema = z.object({
  sessionId:   z.string(),
  citizenPhone: z.string(),
  serviceCode: z.string(),
  text:        z.string(),
})

// ── Routes ────────────────────────────────────────────────────────────────────

export async function webhookRoutes(app: FastifyInstance) {

  // ── WhatsApp Cloud API ────────────────────────────────────────────────────

  // GET /webhooks/whatsapp — vérification Meta (hub.challenge)
  app.get('/webhooks/whatsapp', async (request, reply) => {
    const q = request.query as Record<string, string>
    if (
      q['hub.mode'] === 'subscribe' &&
      q['hub.verify_token'] === (process.env.WHATSAPP_VERIFY_TOKEN ?? '')
    ) {
      return reply.send(q['hub.challenge'])
    }
    return reply.status(403).send('Forbidden')
  })

  // POST /webhooks/whatsapp — messages entrants
  app.post('/webhooks/whatsapp', async (request, reply) => {
    const body = request.body as WaWebhookBody

    if (body.object !== 'whatsapp_business_account') {
      return reply.status(400).send()
    }

    const messages = extractMessages(body)

    // Traiter chaque message en parallèle (chaque expéditeur est indépendant)
    await Promise.allSettled(
      messages.map(async (msg) => {
        await markRead(msg.id).catch(() => {})           // acquitter la lecture
        await handleWhatsAppMessage(msg.from, msg)       // machine à états
      })
    )

    // Meta exige un 200 immédiat
    return reply.status(200).send()
  })

  // ── Asterisk ──────────────────────────────────────────────────────────────

  // POST /webhooks/call-started — appel entrant 3030
  app.post('/webhooks/call-started', async (request, reply) => {
    const body = callStartedSchema.parse(request.body)

    const call = await prisma.call.create({
      data: {
        externalId:   body.callId,
        citizenPhone: body.citizenPhone,
        operateur:    body.operateur,
        langue:       body.langue,
        startedAt:    new Date(body.startedAt),
      },
    })

    // Précharger la fiche citoyen pour l'agent
    const citizen = await prisma.citizen.findUnique({
      where: { telephone: body.citizenPhone },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, categorieService: true, statut: true, createdAt: true },
        },
      },
    })

    broadcast('call:incoming', {
      callId:       call.id,
      externalId:   body.callId,
      citizenPhone: body.citizenPhone,
      langue:       body.langue ?? 'fr',
      citizen,
    }, 'agent')

    broadcast('call:incoming', {
      callId:       call.id,
      citizenPhone: body.citizenPhone,
    }, 'superviseur')

    return reply.send({ ok: true, callId: call.id })
  })

  // POST /webhooks/call-ended — fin d'appel
  app.post('/webhooks/call-ended', async (request, reply) => {
    const body = callEndedSchema.parse(request.body)

    const call = await prisma.call.update({
      where:  { externalId: body.callId },
      data: {
        dureeSecondes: body.dureeSecondes,
        recordingUrl:  body.recordingUrl,
        agentId:       body.agentId,
        endedAt:       new Date(),
      },
    })

    broadcast('call:ended', {
      callId:       call.id,
      dureeSecondes: body.dureeSecondes,
    }, 'superviseur')

    return reply.send({ ok: true })
  })

  // POST /webhooks/ussd-session — Africa's Talking USSD *384#
  app.post('/webhooks/ussd-session', async (request, reply) => {
    const body = ussdSessionSchema.parse(request.body)
    const response = handleUssdMenu(body.text, body.citizenPhone)
    return reply.header('Content-Type', 'text/plain').send(response)
  })
}

// ── Menu USSD *384# ───────────────────────────────────────────────────────────

function handleUssdMenu(text: string, phone: string): string {
  const steps = text.split('*').filter(Boolean)

  // Entrée initiale — menu principal
  if (steps.length === 0) {
    return [
      'CON Bienvenu sur AlloJoy',
      '1. Signaler un besoin',
      '2. Urgences',
      '3. Mon dernier ticket',
      '0. Quitter',
    ].join('\n')
  }

  const [s1, s2, s3] = steps

  if (s1 === '0') return 'END AlloJoy 3030 | WhatsApp: +224 xxx xx xx xx'

  if (s1 === '2') {
    return 'END SAMU 442\nPolice 117\nPompiers 18\nAlloJoy 3030'
  }

  if (s1 === '3') {
    // Pas d'accès DB direct depuis USSD — on redirige
    return `END Appelez le 3030 ou envoyez "ticket" sur WhatsApp pour suivre vos demandes.`
  }

  if (s1 === '1') {
    if (!s2) {
      return [
        'CON Choisissez le service:',
        '1. Plomberie',
        '2. Electricite',
        '3. Menage',
        '4. Transport',
        '5. Autre',
      ].join('\n')
    }

    const SERVICES: Record<string, string> = {
      '1': 'Plomberie', '2': 'Electricite', '3': 'Menage', '4': 'Transport', '5': 'Autre',
    }
    const service = SERVICES[s2]
    if (!service) return 'END Service invalide. Rappellez le *384#'

    if (!s3) {
      return [
        `CON ${service} - Votre commune:`,
        '1. Ratoma',
        '2. Matoto',
        '3. Matam',
        '4. Kaloum',
        '5. Dixinn',
      ].join('\n')
    }

    const COMMUNES: Record<string, string> = {
      '1': 'Ratoma', '2': 'Matoto', '3': 'Matam', '4': 'Kaloum', '5': 'Dixinn',
    }
    const commune = COMMUNES[s3]
    if (!commune) return 'END Commune invalide. Rappellez le *384#'

    // Créer le ticket de manière asynchrone (ne pas bloquer la réponse USSD)
    prisma.citizen.upsert({
      where: { telephone: phone },
      create: { telephone: phone, canalOrigine: 'USSD' },
      update: {},
    }).then((citizen: { id: string }) =>
      prisma.ticket.create({
        data: {
          categorieService:  service.toLowerCase(),
          commune:           commune as any,
          descriptionBesoin: `Demande via USSD *384# — ${service}`,
          statut:            'OUVERT',
          canalOrigine:      'USSD',
          citizenId:         citizen.id,
        },
      })
    ).then((ticket: { id: string }) => {
      broadcast('ticket:created', {
        ticketId: ticket.id,
        canal: 'USSD',
        categorie: service.toLowerCase(),
        commune,
      }, 'superviseur')
    }).catch(() => {})

    return `END Demande enregistree!\nService: ${service}\nCommune: ${commune}\nUn agent vous rappellera.\nAlloJoy 3030`
  }

  return 'END AlloJoy. Appelez le 3030 pour de l\'aide.'
}
