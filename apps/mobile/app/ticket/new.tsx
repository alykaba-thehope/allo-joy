import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { upsertTicket } from '../../src/lib/db'
import { tickets as ticketsApi } from '../../src/lib/api'
import { syncPendingTickets } from '../../src/lib/sync'
import { COMMUNES, colors, spacing, radius, font } from '../../src/theme'

const SERVICES = [
  { id: 'plomberie',    nom: 'Plomberie',    icone: 'water-outline' },
  { id: 'electricite', nom: 'Électricité',  icone: 'flash-outline' },
  { id: 'menage',      nom: 'Ménage',        icone: 'home-outline' },
  { id: 'transport',   nom: 'Transport',     icone: 'car-outline' },
  { id: 'informatique',nom: 'Informatique',  icone: 'laptop-outline' },
  { id: 'jardinage',   nom: 'Jardinage',     icone: 'leaf-outline' },
  { id: 'demenagement',nom: 'Déménagement',  icone: 'cube-outline' },
  { id: 'autre',       nom: 'Autre',         icone: 'ellipsis-horizontal-outline' },
]

export default function NewTicketScreen() {
  const { categorieId } = useLocalSearchParams<{ categorieId?: string }>()
  const queryClient = useQueryClient()

  const [categorie, setCategorie] = useState<string>(categorieId ?? '')
  const [commune, setCommune] = useState<string>('')
  const [description, setDescription] = useState('')
  const [adresse, setAdresse] = useState('')
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedService = SERVICES.find(s => s.id === categorie)

  const locateMe = useCallback(async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permission refusée', 'Activez la localisation dans les paramètres.'); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })

      const geo = await Location.reverseGeocodeAsync(pos.coords)
      if (geo[0]) {
        const parts = [geo[0].street, geo[0].district, geo[0].subregion].filter(Boolean)
        setAdresse(parts.join(', '))
        const communeGuess = COMMUNES.find(c =>
          geo[0].district?.toLowerCase().includes(c.toLowerCase()) ||
          geo[0].subregion?.toLowerCase().includes(c.toLowerCase())
        )
        if (communeGuess) setCommune(communeGuess)
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer la position.')
    } finally {
      setLocating(false)
    }
  }, [])

  async function handleSubmit() {
    if (!categorie) { Alert.alert('Service requis', 'Choisissez un type de service.'); return }
    if (!commune) { Alert.alert('Commune requise', 'Sélectionnez votre commune.'); return }
    if (description.trim().length < 10) { Alert.alert('Description trop courte', 'Décrivez le problème en au moins 10 caractères.'); return }

    setSubmitting(true)
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const now = Date.now()

    upsertTicket({
      id: localId,
      local_id: localId,
      statut: 'OUVERT',
      categorie_id: categorie,
      categorie_nom: selectedService?.nom ?? categorie,
      commune,
      description: description.trim(),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      adresse: adresse || null,
      created_at: now,
      updated_at: now,
      synced: 0,
      sync_error: null,
    })

    queryClient.invalidateQueries({ queryKey: ['tickets-local'] })

    try {
      const created = await ticketsApi.create({
        categorieId: categorie,
        commune,
        description: description.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        adresse: adresse || undefined,
      })

      upsertTicket({
        id: created.id,
        local_id: localId,
        statut: created.statut,
        categorie_id: categorie,
        categorie_nom: selectedService?.nom ?? categorie,
        commune,
        description: description.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        adresse: adresse || null,
        created_at: now,
        updated_at: now,
        synced: 1,
        sync_error: null,
      })

      queryClient.invalidateQueries({ queryKey: ['tickets-local'] })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace(`/ticket/${created.id}`)
    } catch {
      // Ticket sauvegardé localement — sync automatique à la reconnexion
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert(
        'Ticket enregistré',
        'Pas de connexion internet. Votre ticket sera envoyé dès que vous serez connecté.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/tickets') }]
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Service */}
        <Text style={styles.label}>Type de service *</Text>
        <View style={styles.grid}>
          {SERVICES.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.serviceBtn, categorie === s.id && styles.serviceBtnActive]}
              onPress={() => setCategorie(s.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={s.icone as any}
                size={20}
                color={categorie === s.id ? '#fff' : colors.textSecond}
              />
              <Text style={[styles.serviceBtnText, categorie === s.id && styles.serviceBtnTextActive]}>
                {s.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Commune */}
        <Text style={styles.label}>Commune *</Text>
        <View style={styles.communeRow}>
          {COMMUNES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.communeBtn, commune === c && styles.communeBtnActive]}
              onPress={() => setCommune(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.communeBtnText, commune === c && styles.communeBtnTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Localisation */}
        <Text style={styles.label}>Adresse (optionnel)</Text>
        <View style={styles.locRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Rue, quartier…"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.locBtn} onPress={locateMe} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="location" size={20} color={coords ? colors.success : colors.primary} />
            }
          </TouchableOpacity>
        </View>
        {coords && (
          <Text style={styles.coordsHint}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} /> Position GPS capturée
          </Text>
        )}

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez le problème en détail…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length} / 500</Text>

        {/* Soumettre */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Envoyer le ticket</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.offlineNote}>
          <Ionicons name="cloud-outline" size={12} /> Fonctionne sans connexion — synchronisation automatique
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: font.sm, fontWeight: '700', color: colors.textSecond,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  serviceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border,
  },
  serviceBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  serviceBtnText: { fontSize: font.sm, color: colors.textSecond, fontWeight: '500' },
  serviceBtnTextActive: { color: '#fff', fontWeight: '700' },
  communeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  communeBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border,
  },
  communeBtnActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  communeBtnText: { fontSize: font.sm, color: colors.textSecond, fontWeight: '500' },
  communeBtnTextActive: { color: colors.primaryDark, fontWeight: '700' },
  locRow: { flexDirection: 'row', gap: spacing.sm },
  locBtn: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  coordsHint: { fontSize: 12, color: colors.success, marginTop: 4, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: font.base, color: colors.textPrimary,
    height: 48,
  },
  textarea: { height: 120, lineHeight: 22 },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4, marginBottom: spacing.sm },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  offlineNote: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: spacing.md },
})
