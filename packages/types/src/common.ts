export type Language = 'fr' | 'pular' | 'malinke' | 'soussou'

export type Commune =
  | 'Ratoma'
  | 'Matoto'
  | 'Matam'
  | 'Dixinn'
  | 'Kaloum'

export interface GpsPoint {
  lat: number
  lng: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}
