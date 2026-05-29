import type { RouteRequest, RouteResponse, RouteStep, GpsPoint } from '@allo-joy/types'
import prisma from '@/lib/prisma'

const GRAPHHOPPER_URL = process.env.GRAPHHOPPER_URL ?? 'http://localhost:8989'

const PROFILE_MAP = {
  vehicle: 'car',
  bike: 'motorcycle',
  foot: 'foot',
}

export async function calculateRoute(req: RouteRequest): Promise<RouteResponse> {
  const profile = PROFILE_MAP[req.mode]
  const url = new URL(`${GRAPHHOPPER_URL}/route`)
  url.searchParams.set('profile', profile)
  url.searchParams.set('locale', 'fr')
  url.searchParams.set('instructions', 'true')
  url.searchParams.set('calc_points', 'true')
  url.searchParams.set('points_encoded', 'false')
  url.searchParams.append('point', `${req.from.lat},${req.from.lng}`)
  url.searchParams.append('point', `${req.to.lat},${req.to.lng}`)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`GraphHopper error: ${response.status}`)
  }

  const data = await response.json() as GraphHopperResponse
  const path = data.paths[0]

  if (!path) {
    throw new Error('No route found')
  }

  const steps = await enrichStepsWithLocalLandmarks(path.instructions)

  const smsText = buildSmsItinerary(steps, path.distance, path.time)

  return {
    distanceMeters: Math.round(path.distance),
    durationSeconds: Math.round(path.time / 1000),
    steps,
    smsText,
  }
}

async function enrichStepsWithLocalLandmarks(
  instructions: GraphHopperInstruction[]
): Promise<RouteStep[]> {
  const steps: RouteStep[] = []

  for (const instruction of instructions) {
    const point: GpsPoint = {
      lat: instruction.points.coordinates[0]?.[1] ?? 0,
      lng: instruction.points.coordinates[0]?.[0] ?? 0,
    }

    const landmark = await findNearestLandmark(point, 200)

    steps.push({
      instruction: instruction.text,
      distanceMeters: Math.round(instruction.distance),
      durationSeconds: Math.round(instruction.time / 1000),
      position: point,
      repereLocal: landmark ?? undefined,
    })
  }

  return steps
}

async function findNearestLandmark(point: GpsPoint, radiusMeters: number): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ nom_officiel: string; nom_local: string | null }>>`
    SELECT nom_officiel, nom_local
    FROM places
    WHERE ST_DWithin(
      position,
      ST_Point(${point.lng}, ${point.lat})::geography,
      ${radiusMeters}
    )
    AND is_verified = true
    ORDER BY position <-> ST_Point(${point.lng}, ${point.lat})::geography
    LIMIT 1
  `

  if (rows.length === 0) return null
  return rows[0]!.nom_local ?? rows[0]!.nom_officiel
}

function buildSmsItinerary(steps: RouteStep[], distanceM: number, timeMs: number): string {
  const distanceKm = (distanceM / 1000).toFixed(1)
  const durationMin = Math.round(timeMs / 60000)

  const keySteps = steps
    .filter((s) => s.repereLocal)
    .slice(0, 3)
    .map((s) => `- ${s.instruction} (repère: ${s.repereLocal})`)
    .join('\n')

  return `AlloJoy - Itinéraire (${distanceKm}km, ~${durationMin}min)\n${keySteps}\nBon trajet!`
}

interface GraphHopperResponse {
  paths: Array<{
    distance: number
    time: number
    instructions: GraphHopperInstruction[]
  }>
}

interface GraphHopperInstruction {
  text: string
  distance: number
  time: number
  points: {
    coordinates: Array<[number, number]>
  }
}
