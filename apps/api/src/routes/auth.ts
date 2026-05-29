import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { sendOtp, verifyOtp } from '@/services/sms'

const otpRequestSchema = z.object({
  telephone: z.string().min(8).max(20),
  role: z.enum(['agent', 'superviseur', 'prestataire']).default('agent'),
})

const otpVerifySchema = z.object({
  telephone: z.string().min(8).max(20),
  code: z.string().length(6),
  role: z.enum(['agent', 'superviseur', 'prestataire']).default('agent'),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/otp/request — Demander un OTP (agents + prestataires)
  app.post('/auth/otp/request', async (request, reply) => {
    const { telephone, role } = otpRequestSchema.parse(request.body)

    let exists = false
    if (role === 'prestataire') {
      const provider = await prisma.provider.findUnique({ where: { telephonePrincipal: telephone } })
      exists = !!provider && provider.statut !== 'SUSPENDU'
    } else {
      const agent = await prisma.agent.findUnique({ where: { telephone } })
      exists = !!agent && agent.isActive
    }

    if (!exists) {
      // Réponse générique — ne pas révéler si le compte existe
      return reply.send({ message: 'Si ce numéro est enregistré, vous recevrez un code.' })
    }

    await sendOtp(telephone)
    return reply.send({ message: 'Code envoyé' })
  })

  // POST /api/auth/otp/verify — Vérifier l'OTP et obtenir les tokens
  app.post('/auth/otp/verify', async (request, reply) => {
    const { telephone, code, role } = otpVerifySchema.parse(request.body)

    const valid = await verifyOtp(telephone, code)
    if (!valid) {
      return reply.status(401).send({ code: 'INVALID_OTP', message: 'Code invalide ou expiré' })
    }

    // ── Prestataire ────────────────────────────────────────────────────────
    if (role === 'prestataire') {
      const provider = await prisma.provider.findUnique({
        where: { telephonePrincipal: telephone },
      })
      if (!provider || provider.statut === 'SUSPENDU') {
        return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Accès refusé' })
      }

      const accessToken = app.jwt.sign(
        { id: provider.id, role: 'prestataire' },
        { expiresIn: '15m' }
      )
      const refreshToken = app.jwt.sign(
        { id: provider.id, role: 'prestataire', type: 'refresh' },
        { expiresIn: '30d' }
      )

      // Calculer le taux de réussite
      const tauxReussite = provider.nbMissionsTotales > 0
        ? provider.nbMissionsReussies / provider.nbMissionsTotales
        : 0

      return reply.send({
        accessToken,
        refreshToken,
        prenom:           provider.nomComplet.split(' ')[0] ?? provider.nomComplet,
        nomFamille:       provider.nomComplet.split(' ').slice(1).join(' ') ?? '',
        telephone:        provider.telephonePrincipal,
        categorieService: provider.categoriePrincipale,
        langues:          provider.languesParlees ?? [],
        noteMoyenne:      Number(provider.noteMoyenne),
        tauxReussite,
        totalMissions:    provider.nbMissionsTotales,
      })
    }

    // ── Agent / Superviseur ────────────────────────────────────────────────
    const agent = await prisma.agent.findUnique({ where: { telephone } })
    if (!agent || !agent.isActive) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Accès refusé' })
    }

    const accessToken = app.jwt.sign(
      { id: agent.id, role: agent.role },
      { expiresIn: '15m' }
    )
    const refreshToken = app.jwt.sign(
      { id: agent.id, type: 'refresh' },
      { expiresIn: '30d' }
    )

    await prisma.agentSession.create({
      data: {
        agentId:   agent.id,
        token:     refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastSeenAt: new Date() },
    })

    return reply.send({
      accessToken,
      refreshToken,
      agent: { id: agent.id, role: agent.role, prenom: agent.prenom },
    })
  })

  // POST /api/auth/refresh — Rafraîchir le token (agents + prestataires)
  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }

    try {
      const payload = app.jwt.verify(refreshToken) as { id: string; role?: string; type: string }
      if (payload.type !== 'refresh') throw new Error()

      if (payload.role === 'prestataire') {
        const newAccessToken = app.jwt.sign(
          { id: payload.id, role: 'prestataire' },
          { expiresIn: '15m' }
        )
        return reply.send({ accessToken: newAccessToken })
      }

      const session = await prisma.agentSession.findUnique({ where: { token: refreshToken } })
      if (!session || session.expiresAt < new Date()) {
        return reply.status(401).send({ code: 'TOKEN_EXPIRED', message: 'Session expirée' })
      }

      const newAccessToken = app.jwt.sign({ id: payload.id }, { expiresIn: '15m' })
      return reply.send({ accessToken: newAccessToken })
    } catch {
      return reply.status(401).send({ code: 'INVALID_TOKEN', message: 'Token invalide' })
    }
  })

  // POST /api/auth/logout
  app.post('/auth/logout', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (refreshToken) {
      await prisma.agentSession.deleteMany({ where: { token: refreshToken } })
    }
    return reply.send({ message: 'Déconnecté' })
  })
}
