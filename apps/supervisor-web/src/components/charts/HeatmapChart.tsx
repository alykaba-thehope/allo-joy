import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'

interface HeatPoint { commune: string; lat: number; lng: number; count: number; categorie: string }


const MOCK_DATA: HeatPoint[] = [
  { commune: 'Ratoma',  lat: 9.5700, lng: -13.6800, count: 47, categorie: 'plomberie' },
  { commune: 'Matoto',  lat: 9.4800, lng: -13.6200, count: 32, categorie: 'electricite' },
  { commune: 'Matam',   lat: 9.5200, lng: -13.6500, count: 28, categorie: 'transport' },
  { commune: 'Dixinn',  lat: 9.5400, lng: -13.6700, count: 19, categorie: 'sante' },
  { commune: 'Kaloum',  lat: 9.5100, lng: -13.7100, count: 12, categorie: 'plomberie' },
]

const CATEGORIES = ['Toutes', 'plomberie', 'electricite', 'transport', 'sante', 'menage']

export function HeatmapChart() {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const [activeCategory, setActiveCategory] = useState('Toutes')

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
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
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.4 } }],
      },
      center: [-13.6773, 9.5370],
      zoom: 11,
    })

    map.on('load', () => {
      // Source GeoJSON pour la heatmap
      map.addSource('heatmap-data', {
        type: 'geojson',
        data: buildGeoJson(MOCK_DATA),
      })

      // Couche heatmap
      map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap-data',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'count'], 0, 0, 50, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 1.5],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,0,255,0)',
            0.2, 'rgba(0,200,255,0.4)',
            0.4, 'rgba(0,255,100,0.6)',
            0.6, 'rgba(255,200,0,0.7)',
            0.8, 'rgba(255,100,0,0.8)',
            1,   'rgba(255,0,0,0.9)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 13, 50],
          'heatmap-opacity': 0.7,
        },
      })

      // Markers communes avec compteur
      MOCK_DATA.forEach((point) => {
        const el = document.createElement('div')
        el.className = 'commune-marker'
        el.style.cssText = `
          background: rgba(14,165,233,0.9);
          border: 2px solid rgba(255,255,255,0.8);
          border-radius: 50%;
          width: ${20 + point.count / 2}px;
          height: ${20 + point.count / 2}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        `
        el.textContent = String(point.count)

        new maplibregl.Marker({ element: el })
          .setLngLat([point.lng, point.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>${point.commune}</strong><br>${point.count} demandes · ${point.categorie}`
          ))
          .addTo(map)
      })
    })

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // Filtrer par catégorie
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !map.getSource('heatmap-data')) return
    const filtered = activeCategory === 'Toutes'
      ? MOCK_DATA
      : MOCK_DATA.map((d) => ({ ...d, count: d.categorie === activeCategory ? d.count : 0 }))
    ;(map.getSource('heatmap-data') as maplibregl.GeoJSONSource).setData(buildGeoJson(filtered))
  }, [activeCategory])

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <span className="label">Carte de chaleur — demandes par commune</span>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors capitalize ${
                activeCategory === c
                  ? 'bg-joy-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div ref={mapRef} className="flex-1 rounded-b-xl overflow-hidden" />
    </div>
  )
}

function buildGeoJson(data: HeatPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: { count: d.count, commune: d.commune, categorie: d.categorie },
    })),
  }
}
