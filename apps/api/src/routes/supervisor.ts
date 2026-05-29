import type { FastifyInstance } from 'fastify'
import prisma from '@/lib/prisma'

const SUPERVISOR_ROLES = ['superviseur', 'admin', 'directeur']

function requireSupervisor(app: FastifyInstance) {
  return [
    app.authenticate,
    async (request: any, reply: any) => {
      if (!SUPERVISOR_ROLES.includes(request.user?.role)) {
        reply.status(403).send({ code: 'FORBIDDEN', message: 'Accès superviseur requis' })
      }
    },
  ]
}

export async function supervisorRoutes(app: FastifyInstance) {

  // GET /api/supervisor/kpi — KPIs agrégés du jour
  app.get('/supervisor/kpi', { onRequest: requireSupervisor(app) }, async (_request, reply) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [callsTotal, callsResolved, avgDuration, peakHourRow] = await Promise.all([
      // Total appels aujourd'hui
      prisma.ticket.count({
        where: { createdAt: { gte: startOfDay } },
      }),

      // Appels résolus aujourd'hui
      prisma.ticket.count({
        where: {
          createdAt: { gte: startOfDay },
          statut: { in: ['RESOLU', 'FERME'] },
        },
      }),

      // Durée moyenne des appels terminés aujourd'hui
      prisma.call.aggregate({
        where: {
          startedAt: { gte: startOfDay },
          endedAt: { not: null },
        },
        _avg: { dureeSecondes: true },
      }),

      // Heure de pointe (heure avec le plus d'appels)
      prisma.$queryRaw<Array<{ heure: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM started_at)::int AS heure, COUNT(*) AS count
        FROM calls
        WHERE started_at >= ${startOfDay}
        GROUP BY heure
        ORDER BY count DESC
        LIMIT 1
      `,
    ])

    const avgDurationSeconds = Math.round(avgDuration._avg.dureeSecondes ?? 0)
    const resolutionRate = callsTotal > 0 ? callsResolved / callsTotal : 0

    const peakHour = peakHourRow.length > 0
      ? `${peakHourRow[0]!.heure}h-${peakHourRow[0]!.heure + 1}h`
      : '—'

    return reply.send({
      callsTotal,
      callsResolved,
      avgDurationSeconds,
      resolutionRate,
      peakHour,
    })
  })

  // GET /api/supervisor/agents — Liste des agents avec leur statut live
  app.get('/supervisor/agents', { onRequest: requireSupervisor(app) }, async (_request, reply) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        prenom: true,
        nomFamille: true,
        role: true,
        langues: true,
        lastSeenAt: true,
        tickets: {
          where: { createdAt: { gte: startOfDay } },
          select: { id: true },
        },
      },
    })

    type AgentRow = (typeof agents)[number]
    return reply.send(agents.map((a: AgentRow) => ({
      id:           a.id,
      prenom:       a.prenom,
      nomFamille:   a.nomFamille,
      role:         a.role,
      langue:       a.langues ?? [],
      lastSeenAt:   a.lastSeenAt?.getTime() ?? null,
      ticketsToday: a.tickets.length,
    })))
  })

  // GET /api/supervisor/queue — File d'attente et appels actifs
  app.get('/supervisor/queue', { onRequest: requireSupervisor(app) }, async (_request, reply) => {
    const openTickets = await prisma.ticket.findMany({
      where: { statut: { in: ['OUVERT', 'EN_COURS'] } },
      include: {
        citizen: { select: { telephone: true, prenom: true, nomFamille: true } },
        agent: { select: { prenom: true, nomFamille: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return reply.send({ data: openTickets })
  })

  // GET /api/supervisor/alerts — Alertes automatiques
  app.get('/supervisor/alerts', { onRequest: requireSupervisor(app) }, async (_request, reply) => {
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000)
    const fourMinAgo  = new Date(Date.now() - 4 * 60 * 1000)

    const [longCalls, longQueue] = await Promise.all([
      // Agents en appel depuis > 4 min
      prisma.ticket.findMany({
        where: {
          statut: 'EN_COURS',
          createdAt: { lte: fourMinAgo },
        },
        include: { agent: { select: { prenom: true, nomFamille: true } } },
      }),

      // Tickets en attente depuis > 3 min sans agent
      prisma.ticket.findMany({
        where: {
          statut: 'OUVERT',
          agentId: null,
          createdAt: { lte: threeMinAgo },
        },
      }),
    ])

    type LongCall = (typeof longCalls)[number]
    const alerts = [
      ...longCalls.map((t: LongCall) => ({
        type: 'warning' as const,
        message: `${t.agent?.prenom} ${t.agent?.nomFamille} — appel > 4 min (risque SLA)`,
        ticketId: t.id,
      })),
      ...(longQueue.length > 0 ? [{
        type: 'danger' as const,
        message: `File d'attente : ${longQueue.length} appel${longQueue.length > 1 ? 's' : ''} > 3 min sans agent`,
        ticketId: null,
      }] : []),
    ]

    return reply.send({ data: alerts })
  })
}
