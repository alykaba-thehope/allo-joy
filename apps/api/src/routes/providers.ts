import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { findTopProviders } from '@/services/matching'
import { broadcast } from '@/lib/ws'

const searchSchema = z.object({
  commune: z.string().optional(),
  categorie: z.string().optional(),
  available: z.coerce.boolean().optional(),
  noteMinimale: z.coerce.number().min(0).max(5).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
})

const ratingSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(500).optional(),
  ticketId: z.string().uuid(),
})

export async function providerRoutes(app: FastifyInstance) {
  // GET /api/providers — Recherche avec filtres
  app.get('/providers', {
    schema: {
      tags: ['providers'],
      querystring: {
        type: 'object',
        properties: {
          commune: { type: 'string' },
          categorie: { type: 'string' },
          available: { type: 'boolean' },
          noteMinimale: { type: 'number' },
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const query = searchSchema.parse(request.query)

    if (query.commune && query.categorie) {
      const results = await findTopProviders({
        commune: query.commune,
        categorie: query.categorie,
        lat: query.lat,
        lng: query.lng,
      })
      return reply.send({ data: results })
    }

    const providers = await prisma.provider.findMany({
      where: {
        ...(query.available !== undefined && {
          statut: query.available ? 'DISPONIBLE' : undefined,
        }),
        ...(query.commune && {
          communesIntervention: { has: query.commune as any },
        }),
        ...(query.categorie && { categoriePrincipale: query.categorie }),
        ...(query.noteMinimale && {
          noteMoyenne: { gte: query.noteMinimale },
        }),
      },
      orderBy: [{ noteMoyenne: 'desc' }, { nbMissionsTotales: 'desc' }],
      take: 20,
    })

    return reply.send({ data: providers })
  })

  // GET /api/providers/:id — Fiche complète
  app.get<{ Params: { id: string } }>('/providers/:id', async (request, reply) => {
    const provider = await prisma.provider.findUnique({
      where: { id: request.params.id },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!provider) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Prestataire introuvable' })
    return reply.send(provider)
  })

  // PUT /api/providers/:id/status — Mise à jour disponibilité
  app.put<{
    Params: { id: string }
    Body: { statut: 'DISPONIBLE' | 'OCCUPE' | 'HORS_LIGNE' }
  }>('/providers/:id/status', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { statut } = request.body

    const provider = await prisma.provider.update({
      where: { id: request.params.id },
      data: { statut },
    })

    return reply.send(provider)
  })

  // POST /api/providers/:id/rating — Soumettre une notation
  app.post<{ Params: { id: string } }>(
    '/providers/:id/rating',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = ratingSchema.parse(request.body)

      const rating = await prisma.providerRating.create({
        data: {
          providerId: request.params.id,
          ticketId: body.ticketId,
          note: body.note,
          commentaire: body.commentaire,
        },
      })

      // Recalculer la note moyenne du prestataire
      await updateProviderStats(request.params.id)

      return reply.status(201).send(rating)
    }
  )
}

// ── Portail Prestataire — routes authentifiées par token prestataire ──────────

export async function providerPortalRoutes(app: FastifyInstance) {

  function requireProvider(request: any, reply: any, done: () => void) {
    if (request.user?.role !== 'prestataire') {
      reply.status(403).send({ code: 'FORBIDDEN', message: 'Accès prestataire requis' })
      return
    }
    done()
  }

  // GET /api/providers/me — Profil complet du prestataire connecté
  app.get('/providers/me', { onRequest: [app.authenticate, requireProvider] }, async (request, reply) => {
    const providerId = (request.user as { id: string }).id
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { note: true, commentaire: true, createdAt: true },
        },
      },
    })
    if (!provider) return reply.status(404).send({ code: 'NOT_FOUND' })
    return reply.send(provider)
  })

  // PUT /api/providers/me/status — Changer sa disponibilité
  app.put<{ Body: { statut: 'DISPONIBLE' | 'OCCUPE' | 'HORS_LIGNE' } }>(
    '/providers/me/status',
    { onRequest: [app.authenticate, requireProvider] },
    async (request, reply) => {
      const providerId = (request.user as { id: string }).id
      const { statut } = request.body

      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: { statut },
      })

      // Notifier les superviseurs du changement de statut
      broadcast('provider:status', { providerId, statut }, 'superviseur')

      return reply.send({ statut: provider.statut })
    }
  )

  // GET /api/providers/me/missions — Historique des missions
  app.get<{ Querystring: { page?: string; statut?: string } }>(
    '/providers/me/missions',
    { onRequest: [app.authenticate, requireProvider] },
    async (request, reply) => {
      const providerId = (request.user as { id: string }).id
      const page = parseInt(request.query.page ?? '1')
      const pageSize = 20

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where: {
            providerId,
            ...(request.query.statut && { statut: request.query.statut as any }),
          },
          include: {
            citizen: { select: { telephone: true, prenom: true } },
            rating: { select: { note: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        prisma.ticket.count({ where: { providerId } }),
      ])

      return reply.send({ data: tickets, total, page, pageSize })
    }
  )
}

async function updateProviderStats(providerId: string) {
  const stats = await prisma.providerRating.aggregate({
    where: { providerId },
    _avg: { note: true },
    _count: true,
  })

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      noteMoyenne: stats._avg.note ?? 0,
    },
  })
}
