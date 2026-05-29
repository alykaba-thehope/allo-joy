import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { sendSms } from '@/services/sms'
import { findTopProviders } from '@/services/matching'
import { sendToUser, broadcast } from '@/lib/ws'

const createTicketSchema = z.object({
  citizenPhone: z.string().min(8).max(20),
  categorieService: z.string().min(1).max(100),
  commune: z.string().optional(),
  langue: z.enum(['fr', 'pular', 'malinke', 'soussou']).default('fr'),
  descriptionBesoin: z.string().min(1).max(1000),
  callId: z.string().optional(),
})

const callbackSchema = z.object({
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
})

export async function ticketRoutes(app: FastifyInstance) {
  // POST /api/tickets — Créer un ticket
  app.post('/tickets', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = createTicketSchema.parse(request.body)
    const agentId = (request.user as { id: string }).id

    // Trouver ou créer le citoyen
    const citizen = await prisma.citizen.upsert({
      where: { telephone: body.citizenPhone },
      update: {
        languePreferee: body.langue,
        ...(body.commune && { commune: body.commune as any }),
        nbDemandesTotales: { increment: 1 },
      },
      create: {
        telephone: body.citizenPhone,
        languePreferee: body.langue,
        commune: body.commune as any,
        nbDemandesTotales: 1,
      },
    })

    const ticket = await prisma.ticket.create({
      data: {
        citizenId: citizen.id,
        agentId,
        categorieService: body.categorieService,
        commune: body.commune as any,
        langue: body.langue,
        descriptionBesoin: body.descriptionBesoin,
        callId: body.callId,
      },
      include: { citizen: true, agent: true },
    })

    // Broadcast aux superviseurs
    broadcast('ticket:created', {
      ticketId:         ticket.id,
      citizenPhone:     ticket.citizen.telephone,
      categorieService: ticket.categorieService,
      commune:          ticket.commune,
      langue:           ticket.langue,
    }, 'superviseur')

    // Dispatch mission : trouver le meilleur prestataire disponible et le notifier
    if (ticket.commune) {
      dispatchMission(ticket).catch((err) =>
        console.error('[dispatch] Erreur mission dispatch:', err)
      )
    }

    return reply.status(201).send(ticket)
  })

  // PUT /api/tickets/:id/status — Mettre à jour le statut
  app.put<{
    Params: { id: string }
    Body: { statut: string; providerId?: string; notes?: string }
  }>('/tickets/:id/status', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { statut, providerId, notes } = request.body

    const ticket = await prisma.ticket.update({
      where: { id: request.params.id },
      data: {
        statut: statut as any,
        ...(providerId && { providerId }),
        ...(notes && { notes }),
        ...(statut === 'CLOTURE' && { closedAt: new Date() }),
      },
    })

    return reply.send(ticket)
  })

  // POST /api/tickets/:id/callback — Programmer un rappel
  app.post<{ Params: { id: string } }>(
    '/tickets/:id/callback',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = callbackSchema.parse(request.body)

      const ticket = await prisma.ticket.update({
        where: { id: request.params.id },
        data: { rappelProgrammeAt: new Date(body.scheduledAt) },
        include: { citizen: true },
      })

      // Notifier le citoyen par SMS
      await sendSms({
        to: ticket.citizen.telephone,
        message: `AlloJoy: Un agent vous rappellera le ${new Date(body.scheduledAt).toLocaleDateString('fr-FR')}. Ref: ${ticket.id.slice(0, 8).toUpperCase()}`,
      })

      return reply.send(ticket)
    }
  )

  // GET /api/tickets — Liste filtrée
  app.get<{
    Querystring: { statut?: string; agentId?: string; page?: string }
  }>('/tickets', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { statut, agentId, page = '1' } = request.query
    const pageSize = 20
    const skip = (parseInt(page) - 1) * pageSize

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          ...(statut && { statut: statut as any }),
          ...(agentId && { agentId }),
        },
        include: { citizen: true, provider: true },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      prisma.ticket.count({
        where: {
          ...(statut && { statut: statut as any }),
          ...(agentId && { agentId }),
        },
      }),
    ])

    return reply.send({ data: tickets, total, page: parseInt(page), pageSize })
  })
}

// ── Mission dispatch ─────────────────────────────────────────────────────────
// Appelé après la création d'un ticket. Cherche le meilleur prestataire
// disponible et lui envoie une notification WebSocket.

async function dispatchMission(ticket: {
  id: string
  categorieService: string
  commune: any
  descriptionBesoin: string
  citizen: { telephone: string }
}) {
  const candidates = await findTopProviders({
    commune:   String(ticket.commune),
    categorie: ticket.categorieService,
    limit:     1,
  })

  if (candidates.length === 0) return

  const best = candidates[0]!

  // Mettre à jour le ticket avec le prestataire sélectionné
  await prisma.ticket.update({
    where: { id: ticket.id },
    data:  { statut: 'MISE_EN_RELATION', providerId: best.id },
  })

  // Notifier le prestataire via WebSocket
  sendToUser(best.id, 'mission:incoming', {
    ticketId:         ticket.id,
    categorieService: ticket.categorieService,
    commune:          String(ticket.commune),
    description:      ticket.descriptionBesoin,
    citizenPhone:     ticket.citizen.telephone,
  })

  // Informer les superviseurs de la mise en relation
  broadcast('ticket:dispatched', {
    ticketId:    ticket.id,
    providerId:  best.id,
    providerName: best.nomComplet,
    score:       best.score,
  }, 'superviseur')
}
