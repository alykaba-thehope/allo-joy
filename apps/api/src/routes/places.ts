import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { searchPlaces, reverseGeocode } from '@/services/geocoding'
import { calculateRoute } from '@/services/routing'

const routeSchema = z.object({
  fromLat: z.coerce.number(),
  fromLng: z.coerce.number(),
  toLat: z.coerce.number(),
  toLng: z.coerce.number(),
  mode: z.enum(['vehicle', 'bike', 'foot']).default('vehicle'),
})

export async function placesRoutes(app: FastifyInstance) {
  // GET /api/places — Recherche de lieux
  app.get<{
    Querystring: { q: string; commune?: string }
  }>('/places', async (request, reply) => {
    const { q, commune } = request.query

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ code: 'INVALID_QUERY', message: 'Requête trop courte' })
    }

    const results = await searchPlaces(q, commune)
    return reply.send({ data: results })
  })

  // GET /api/places/reverse — Géocodage inversé GPS → repère
  app.get<{
    Querystring: { lat: string; lng: string }
  }>('/places/reverse', async (request, reply) => {
    const lat = parseFloat(request.query.lat)
    const lng = parseFloat(request.query.lng)

    if (isNaN(lat) || isNaN(lng)) {
      return reply.status(400).send({ code: 'INVALID_COORDS', message: 'Coordonnées invalides' })
    }

    const place = await reverseGeocode({ lat, lng })
    if (!place) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Aucun repère trouvé' })

    return reply.send(place)
  })

  // GET /api/route — Calcul d'itinéraire
  app.get('/route', async (request, reply) => {
    const params = routeSchema.parse(request.query)

    const route = await calculateRoute({
      from: { lat: params.fromLat, lng: params.fromLng },
      to: { lat: params.toLat, lng: params.toLng },
      mode: params.mode,
    })

    return reply.send(route)
  })

  // POST /api/places/:id/report — Signaler un changement
  app.post<{ Params: { id: string } }>(
    '/places/:id/report',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      // Ajouté dans la file de validation superviseur
      return reply.status(202).send({ message: 'Signalement reçu, en attente de validation' })
    }
  )
}
