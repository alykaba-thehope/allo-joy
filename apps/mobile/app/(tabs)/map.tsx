import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapLibreGL from '@maplibre/maplibre-react-native'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { providers, type ProviderResponse } from '../../src/lib/api'
import { colors, spacing, radius, font } from '../../src/theme'

MapLibreGL.setAccessToken(null)

const CONAKRY = { longitude: -13.6773, latitude: 9.6412 }
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [permDenied, setPermDenied] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderResponse | null>(null)

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') { setPermDenied(true); return }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        .catch(() => setPermDenied(true))
    })
  }, [])

  const { data: nearbyProviders = [], isFetching } = useQuery({
    queryKey: ['providers-nearby', location?.latitude, location?.longitude],
    queryFn: () => providers.nearby(location!.latitude, location!.longitude),
    enabled: !!location,
    staleTime: 60_000,
  })

  const center = location ?? CONAKRY

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Carte</Text>
        {isFetching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={styles.map}
          styleURL={JSON.stringify({
            version: 8,
            sources: {
              osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256, attribution: '© OpenStreetMap' },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          })}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            centerCoordinate={[center.longitude, center.latitude]}
            zoomLevel={13}
          />

          {/* Position utilisateur */}
          {location && (
            <MapLibreGL.PointAnnotation
              id="user"
              coordinate={[location.longitude, location.latitude]}
            >
              <View style={styles.userDot} />
            </MapLibreGL.PointAnnotation>
          )}

          {/* Prestataires */}
          {nearbyProviders.map(p => (
            <MapLibreGL.PointAnnotation
              key={p.id}
              id={p.id}
              coordinate={[
                CONAKRY.longitude + (Math.random() - 0.5) * 0.04,
                CONAKRY.latitude  + (Math.random() - 0.5) * 0.04,
              ]}
              onSelected={() => setSelectedProvider(p)}
            >
              <View style={styles.providerPin}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            </MapLibreGL.PointAnnotation>
          ))}
        </MapLibreGL.MapView>

        {permDenied && (
          <View style={styles.permBanner}>
            <Ionicons name="location-outline" size={16} color={colors.warning} />
            <Text style={styles.permText}>Localisation désactivée — affichage centré sur Conakry</Text>
          </View>
        )}
      </View>

      {/* Fiche prestataire sélectionné */}
      {selectedProvider && (
        <View style={styles.providerSheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProvider(null)}>
            <Ionicons name="close" size={20} color={colors.textSecond} />
          </TouchableOpacity>
          <Text style={styles.providerName}>{selectedProvider.prenom} {selectedProvider.nomFamille}</Text>
          <Text style={styles.providerCategorie}>{selectedProvider.categorieService}</Text>
          <View style={styles.providerMeta}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.metaText}>{selectedProvider.noteMoyenne.toFixed(1)}</Text>
            {selectedProvider.distanceKm != null && (
              <>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{selectedProvider.distanceKm.toFixed(1)} km</Text>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, paddingBottom: spacing.sm,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.textPrimary },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  userDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  providerPin: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  permBanner: {
    position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.md,
    padding: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  permText: { flex: 1, fontSize: 12, color: colors.textSecond },
  providerSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingTop: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.xs },
  providerName: { fontSize: font.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  providerCategorie: { fontSize: font.base, color: colors.textSecond, marginBottom: spacing.sm },
  providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: font.sm, color: colors.textSecond },
  dot: { color: colors.textMuted },
})
