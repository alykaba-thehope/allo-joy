import { useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useCitizenStore } from '../../src/stores/citizenStore'
import { getAllTickets } from '../../src/lib/db'
import { fullSync } from '../../src/lib/sync'
import { STATUS_COLOR, STATUS_LABEL, CATEGORY_ICONS, colors, spacing, radius, font } from '../../src/theme'

const SERVICES = [
  { id: 'plomberie',    nom: 'Plomberie',    icone: 'water-outline' },
  { id: 'electricite', nom: 'Électricité',  icone: 'flash-outline' },
  { id: 'menage',      nom: 'Ménage',        icone: 'home-outline' },
  { id: 'transport',   nom: 'Transport',     icone: 'car-outline' },
  { id: 'informatique',nom: 'Informatique',  icone: 'laptop-outline' },
  { id: 'autre',       nom: 'Autre',         icone: 'ellipsis-horizontal-outline' },
]

export default function HomeScreen() {
  const prenom = useCitizenStore(s => s.prenom)

  const { data: tickets = [], refetch, isRefetching } = useQuery({
    queryKey: ['tickets-local'],
    queryFn: () => getAllTickets().slice(0, 3),
  })

  async function handleRefresh() {
    await fullSync()
    refetch()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour{prenom ? `, ${prenom}` : ''} 👋</Text>
            <Text style={styles.subGreeting}>Que puis-je faire pour vous ?</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Bouton signalement */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/ticket/new')}
          activeOpacity={0.85}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="add-circle" size={32} color="#fff" />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Signaler un problème</Text>
            <Text style={styles.ctaSubtitle}>Plomberie, électricité, ménage…</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Grille services */}
        <Text style={styles.sectionTitle}>Services disponibles</Text>
        <View style={styles.grid}>
          {SERVICES.map(s => (
            <TouchableOpacity
              key={s.id}
              style={styles.serviceCard}
              onPress={() => router.push({ pathname: '/ticket/new', params: { categorieId: s.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={s.icone as any} size={24} color={colors.primary} />
              </View>
              <Text style={styles.serviceLabel}>{s.nom}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Derniers tickets */}
        {tickets.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Derniers tickets</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tickets')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {tickets.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.ticketRow}
                onPress={() => router.push(`/ticket/${t.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.ticketDot, { backgroundColor: STATUS_COLOR[t.statut] ?? colors.textMuted }]} />
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketCategorie}>{t.categorie_nom}</Text>
                  <Text style={styles.ticketCommune}>{t.commune} · {t.synced ? '' : '⏳ '}{STATUS_LABEL[t.statut] ?? t.statut}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: { fontSize: font.xl, fontWeight: '700', color: colors.textPrimary },
  subGreeting: { fontSize: font.base, color: colors.textSecond, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: font.md, fontWeight: '700', color: '#fff' },
  ctaSubtitle: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.lg },
  seeAll: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg,
  },
  serviceCard: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  serviceIcon: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  serviceLabel: { fontSize: font.sm, color: colors.textPrimary, textAlign: 'center', fontWeight: '500' },
  ticketRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ticketDot: { width: 10, height: 10, borderRadius: 5 },
  ticketInfo: { flex: 1 },
  ticketCategorie: { fontSize: font.base, fontWeight: '600', color: colors.textPrimary },
  ticketCommune: { fontSize: font.sm, color: colors.textSecond, marginTop: 2 },
})
