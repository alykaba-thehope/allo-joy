import { useState, useRef, useEffect } from 'react'
import { useCallStore } from '@/stores/callStore'
import { smsApi } from '@/lib/api'
import { StarRating, Spinner } from '@/components/ui'
import { placesApi } from '@/lib/api'
import type { ProviderScore } from '@allo-joy/types'
import maplibregl from 'maplibre-gl'

export function ResultsPanel() {
  const { rightPanel, setRightPanel, providers, loadingProviders, activeCall, citizen } = useCallStore()

  return (
    <div className="panel h-full rounded-r-xl">
      {/* Tabs */}
      <div className="panel-header">
        <div className="flex gap-1">
          {([
            { id: 'providers', label: '👥 Prestataires' },
            { id: 'map',       label: '🗺️ Carte' },
            { id: 'docs',      label: '📚 Infos' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanel(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                rightPanel === tab.id
                  ? 'bg-joy-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {rightPanel === 'providers' && (
          <ProvidersTab
            providers={providers}
            loading={loadingProviders}
            citizenPhone={activeCall?.citizenPhone}
          />
        )}
        {rightPanel === 'map' && (
          <MapTab citizenCommune={citizen?.commune ?? undefined} />
        )}
        {rightPanel === 'docs' && <DocsTab />}
      </div>
    </div>
  )
}

// ─── Onglet Prestataires ──────────────────────────────────────────────────────

function ProvidersTab({
  providers,
  loading,
  citizenPhone,
}: {
  providers: ProviderScore[]
  loading: boolean
  citizenPhone?: string
}) {
  const [smsSending, setSmsSending] = useState<string | null>(null)
  const [smsSent, setSmsSent] = useState<string | null>(null)

  const handleSendSms = async (provider: ProviderScore) => {
    if (!citizenPhone) return
    setSmsSending(provider.id)
    try {
      const msg = `AlloJoy: Mise en relation avec ${provider.nomComplet} (${provider.telephonePrincipal}). Note: ${provider.noteMoyenne.toFixed(1)}/5. Bonne journée!`
      await smsApi.send(citizenPhone, msg)
      setSmsSent(provider.id)
      setTimeout(() => setSmsSent(null), 3000)
    } finally {
      setSmsSending(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <Spinner className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Recherche en cours...</p>
        </div>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-slate-400 text-sm">Sélectionnez une catégorie</p>
          <p className="text-slate-500 text-xs mt-1">pour voir les prestataires disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <p className="text-xs text-slate-500 px-1 mb-3">
        {providers.length} prestataire{providers.length > 1 ? 's' : ''} trouvé{providers.length > 1 ? 's' : ''}
      </p>

      {providers.map((p, i) => (
        <div
          key={p.id}
          className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 space-y-3 hover:border-joy-600/40 transition-colors"
        >
          {/* Rang + nom */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i === 0 ? 'bg-yellow-500 text-black' :
                i === 1 ? 'bg-slate-400 text-black' :
                          'bg-amber-700 text-white'
              }`}>
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-sm text-white leading-tight">{p.nomComplet}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.categoriePrincipale}</p>
              </div>
            </div>
            <div className={`tag-tier-${p.abonnementTier} flex-shrink-0`}>
              {p.abonnementTier}
            </div>
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-lg p-2">
              <StarRating value={p.noteMoyenne} />
              <p className="text-xs text-slate-400 mt-1">{p.noteMoyenne.toFixed(1)}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-2">
              <p className="text-sm font-bold text-white">
                {p.nbMissionsTotales > 0
                  ? `${Math.round((p.nbMissionsReussies / p.nbMissionsTotales) * 100)}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-400">réussite</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-2">
              <p className="text-sm font-bold text-white">
                {p.distanceKm >= 0 ? `${p.distanceKm.toFixed(1)}km` : '—'}
              </p>
              <p className="text-xs text-slate-400">distance</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-joy-600 to-joy-400 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round(p.score * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {Math.round(p.score * 100)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={`tel:${p.telephonePrincipal}`}
              className="btn-secondary flex-1 text-xs justify-center"
            >
              📞 {p.telephonePrincipal}
            </a>
            <button
              onClick={() => handleSendSms(p)}
              disabled={smsSending === p.id}
              className={`btn-primary flex-1 text-xs ${smsSent === p.id ? 'bg-green-600 hover:bg-green-600' : ''}`}
            >
              {smsSending === p.id ? (
                <Spinner className="w-3 h-3" />
              ) : smsSent === p.id ? (
                '✓ SMS envoyé'
              ) : (
                '✉ Envoyer SMS'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Onglet Carte ─────────────────────────────────────────────────────────────

function MapTab({ citizenCommune }: { citizenCommune?: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [route, setRoute] = useState<{ distanceMeters: number; durationSeconds: number; smsText: string } | null>(null)
  const [fromCoords, setFromCoords] = useState('')
  const [toQuery, setToQuery] = useState('')

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = new maplibregl.Map({
      container: mapRef.current,
      // Tuiles OSM libres — pas de token requis
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      // Centré sur Conakry
      center: [-13.6773, 9.5370],
      zoom: 12,
    })

    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await placesApi.search(searchQuery, citizenCommune)
      const places = res.data as Array<{ nomOfficiel: string; position: { lat: number; lng: number } }>

      if (places[0]?.position && mapInstance.current) {
        mapInstance.current.flyTo({
          center: [places[0].position.lng, places[0].position.lat],
          zoom: 16,
          speed: 1.5,
        })

        new maplibregl.Marker({ color: '#0ea5e9' })
          .setLngLat([places[0].position.lng, places[0].position.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<strong>${places[0].nomOfficiel}</strong>`))
          .addTo(mapInstance.current!)
      }
    } finally {
      setSearching(false)
    }
  }

  const handleRoute = async () => {
    const [fromLat, fromLng] = fromCoords.split(',').map(Number)
    if (!fromLat || !fromLng || !toQuery) return

    try {
      const places = await placesApi.search(toQuery)
      const dest = (places.data as Array<{ position: { lat: number; lng: number }; nomOfficiel: string }>)[0]
      if (!dest) return

      const r = await placesApi.route({
        fromLat, fromLng,
        toLat: dest.position.lat, toLng: dest.position.lng,
      })
      setRoute(r)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Barre de recherche */}
      <div className="p-3 space-y-2 border-b border-slate-700 flex-shrink-0">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-xs"
            placeholder="Rechercher un lieu (ex: CHU Donka)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={searching} className="btn-primary px-3 text-xs">
            {searching ? <Spinner className="w-3 h-3" /> : '🔍'}
          </button>
        </div>

        {/* Calcul itinéraire */}
        <div className="flex gap-2">
          <input
            className="input flex-1 text-xs"
            placeholder="Depuis (lat,lng)"
            value={fromCoords}
            onChange={(e) => setFromCoords(e.target.value)}
          />
          <input
            className="input flex-1 text-xs"
            placeholder="Vers (nom de lieu)"
            value={toQuery}
            onChange={(e) => setToQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoute()}
          />
          <button onClick={handleRoute} className="btn-secondary px-3 text-xs flex-shrink-0">
            🧭
          </button>
        </div>

        {/* Résumé itinéraire + SMS */}
        {route && (
          <div className="bg-slate-700/50 rounded-lg p-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-300">
              {(route.distanceMeters / 1000).toFixed(1)}km · {Math.round(route.durationSeconds / 60)} min
            </span>
            <button
              onClick={() => {
                // Le texte SMS est pré-formaté par le backend
                navigator.clipboard.writeText(route.smsText)
              }}
              className="btn-ghost text-xs px-2 py-1"
            >
              📋 Copier SMS
            </button>
          </div>
        )}
      </div>

      {/* Carte */}
      <div ref={mapRef} className="flex-1" />
    </div>
  )
}

// ─── Onglet Docs ──────────────────────────────────────────────────────────────

function DocsTab() {
  const URGENCES = [
    { label: 'SAMU', number: '442',  color: 'red' },
    { label: 'Police', number: '117', color: 'blue' },
    { label: 'Pompiers', number: '18', color: 'amber' },
    { label: 'AlloJoy', number: '3030', color: 'green' },
  ] as const

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Numéros d'urgence — Conakry
        </p>
        <div className="grid grid-cols-2 gap-2">
          {URGENCES.map((u) => (
            <a
              key={u.label}
              href={`tel:${u.number}`}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                u.color === 'red'   ? 'bg-red-900/20 border-red-700/30 hover:border-red-600/50' :
                u.color === 'blue'  ? 'bg-blue-900/20 border-blue-700/30 hover:border-blue-600/50' :
                u.color === 'amber' ? 'bg-amber-900/20 border-amber-700/30 hover:border-amber-600/50' :
                                      'bg-green-900/20 border-green-700/30 hover:border-green-600/50'
              }`}
            >
              <span className="text-sm font-medium text-slate-200">{u.label}</span>
              <span className="font-mono text-lg font-bold text-white">{u.number}</span>
            </a>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Catégories de services
        </p>
        <div className="space-y-1 text-sm text-slate-300">
          {[
            ['Plomberie', 'Fuites, installations, réparations eau'],
            ['Électricité', 'Pannes, installations, câblage'],
            ['Transport', 'Taxi, déménagement, livraison'],
            ['Santé', 'Médecins, pharmacies, hôpitaux'],
            ['Maçonnerie', 'Construction, rénovation'],
          ].map(([cat, desc]) => (
            <div key={cat} className="flex gap-3 py-2 border-b border-slate-700/50">
              <span className="font-medium w-24 flex-shrink-0">{cat}</span>
              <span className="text-slate-400 text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
