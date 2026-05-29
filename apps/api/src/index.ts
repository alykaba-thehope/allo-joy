import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import redis from '@/lib/redis'

import { authRoutes }       from '@/routes/auth'
import { citizenRoutes }    from '@/routes/citizens'
import { providerRoutes, providerPortalRoutes } from '@/routes/providers'
import { ticketRoutes }     from '@/routes/tickets'
import { placesRoutes }     from '@/routes/places'
import { webhookRoutes }    from '@/routes/webhooks'
import { supervisorRoutes } from '@/routes/supervisor'
import { register, unregister, broadcast } from '@/lib/ws'
import type { WsRole } from '@/lib/ws'
import { startAriClient } from '@/services/asterisk-ari'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty' },
    }),
  },
})

async function bootstrap() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false, // géré par reverse proxy en prod
  })

  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://agent.allojoy.gn', 'https://prestataires.allojoy.gn']
      : true,
    credentials: true,
  })

  // Rate limiting
  await app.register(rateLimit, {
    redis,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const user = (req as any).user
      return user ? `agent:${user.id}` : req.ip
    },
    // Les agents authentifiés ont un quota plus élevé
    allowList: [],
  })

  // Auth JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  })

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Token manquant ou invalide' })
    }
  })

  // WebSocket (temps réel file d'attente, statuts agents)
  await app.register(websocket)

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Allô Joy API',
        description: 'API de la plateforme multiservices Allô Joy — Conakry, Guinée',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Développement' },
        { url: 'https://api.allojoy.gn', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  })

  // Routes — toutes préfixées /api
  await app.register(async (api) => {
    await api.register(authRoutes)
    await api.register(citizenRoutes)
    await api.register(providerRoutes)
    await api.register(providerPortalRoutes)
    await api.register(ticketRoutes)
    await api.register(placesRoutes)
    await api.register(supervisorRoutes)
  }, { prefix: '/api' })

  // Webhooks Asterisk — sans préfixe /api (appelés par Asterisk directement)
  await app.register(webhookRoutes)

  // Healthcheck
  app.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  // WebSocket endpoint — temps réel agents / superviseurs / prestataires
  app.get('/ws', { websocket: true }, (socket, request) => {
    // Authentifier via token query param
    const token = (request.query as Record<string, string>).token
    let userId = 'anonymous'
    let role: WsRole = 'agent'

    try {
      const payload = app.jwt.verify(token ?? '') as { id: string; role?: string }
      userId = payload.id
      const r = payload.role ?? 'agent'
      if (r === 'superviseur' || r === 'admin' || r === 'directeur') role = 'superviseur'
      else if (r === 'prestataire') role = 'prestataire'
      else role = 'agent'
    } catch {
      // Token invalide → connexion anonyme (utile en dev)
    }

    register(socket, role, userId)

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown }

        switch (msg.type) {
          case 'agent:status':
            // Agent change de statut → broadcast aux superviseurs
            broadcast('agent:status', { agentId: userId, ...(msg.payload as object) }, 'superviseur')
            break

          case 'provider:status':
            // Prestataire change de disponibilité → rien à broadcaster ici,
            // le PUT /api/providers/me/status met à jour la BDD
            break

          case 'mission:response': {
            // Prestataire a accepté ou refusé une mission
            const p = msg.payload as { ticketId: string; accepted: boolean }
            broadcast('mission:response', { providerId: userId, ...p }, 'superviseur')
            break
          }
        }
      } catch { /* ignorer les messages malformés */ }
    })

    socket.on('close', () => unregister(socket))
  })

  const port = parseInt(process.env.PORT ?? '3000')
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info(`AlloJoy API démarrée sur le port ${port}`)
  app.log.info(`Swagger disponible sur http://localhost:${port}/docs`)

  // ARI optionnel — ne démarre que si ASTERISK_ARI_URL est défini
  if (process.env.ASTERISK_ARI_URL) {
    startAriClient()
    app.log.info('Asterisk ARI client démarré')
  }
}

bootstrap().catch((err) => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})

// Type augmentation Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>
    websocketServer: any
  }
}
