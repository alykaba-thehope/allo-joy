import type { FastifyInstance } from 'fastify'
import prisma from '@/lib/prisma'

export async function citizenRoutes(app: FastifyInstance) {
  // GET /api/citizens/:phone — Fiche citoyen + historique
  app.get<{ Params: { phone: string } }>(
    '/citizens/:phone',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const citizen = await prisma.citizen.findUnique({
        where: { telephone: request.params.phone },
        include: {
          tickets: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              categorieService: true,
              statut: true,
              commune: true,
              createdAt: true,
              closedAt: true,
            },
          },
        },
      })

      if (!citizen) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Citoyen introuvable' })
      return reply.send(citizen)
    }
  )

  // PUT /api/citizens/:phone — Mettre à jour un citoyen
  app.put<{
    Params: { phone: string }
    Body: { prenom?: string; nomFamille?: string; commune?: string; notes?: string }
  }>('/citizens/:phone', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { prenom, nomFamille, commune, notes } = request.body

    const citizen = await prisma.citizen.upsert({
      where: { telephone: request.params.phone },
      update: {
        ...(prenom && { prenom }),
        ...(nomFamille && { nomFamille }),
        ...(commune && { commune: commune as any }),
        ...(notes !== undefined && { notes }),
      },
      create: {
        telephone: request.params.phone,
        prenom,
        nomFamille,
        commune: commune as any,
        notes: notes ?? '',
      },
    })

    return reply.send(citizen)
  })
}
