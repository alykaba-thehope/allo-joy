import type { Commune, GpsPoint } from './common'

export type PlaceType =
  | 'SANTE'
  | 'ADMINISTRATION'
  | 'COMMERCE'
  | 'RELIGION'
  | 'EDUCATION'
  | 'TRANSPORT'
  | 'REPERE'
  | 'AUTRE'

export interface Place {
  id: string
  nomOfficiel: string
  nomLocal?: string
  nomPular?: string
  nomMalinke?: string
  nomSoussou?: string
  commune: Commune
  quartier?: string
  position: GpsPoint
  precisionMetres: number
  typeLieu: PlaceType
  repereProximite: string[]
  photosFacadeUrl: string[]
  horaires?: Record<string, string>
  contact?: string
  dateVerification?: string
  confidenceScore?: number
}

export interface PlaceSearchParams {
  q: string
  commune?: Commune
  type?: PlaceType
  lat?: number
  lng?: number
  radiusMeters?: number
}

export interface RouteRequest {
  from: GpsPoint
  to: GpsPoint
  mode: 'vehicle' | 'bike' | 'foot'
}

export interface RouteStep {
  instruction: string
  distanceMeters: number
  durationSeconds: number
  position: GpsPoint
  repereLocal?: string
}

export interface RouteResponse {
  distanceMeters: number
  durationSeconds: number
  steps: RouteStep[]
  smsText: string
}
