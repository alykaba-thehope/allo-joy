import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { tickets as ticketsApi } from '../../src/lib/api'
import { getAllTickets } from '../../src/lib/db'
import { STATUS_COLOR, STATUS_LABEL, colors, spacing, radius, font } from '../../src/theme'
import { formatDate } from '../../src/lib/date'

const STEP_ORDER = ['OUVERT', 'EN_COURS', 'MISE_EN_RELATION', 'RESOLU']

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  // Cherche d'abord dans le cache local
  const localTickets = getAllTickets()
  const localTicket = localTickets.find(t => t.id === id || t.local_id === id)

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id!),
    enabled: !!id && !id.startsWith('local-'),
    initialData: localTicket
      ? { id: localTicket.id, statut: localTicket.statut, categorieService: localTicket.categorie_nom,
          commune: localTicket.commune, description: localTicket.description,
          createdAt: new Date(localTicket.created_at).toISOString(),
          updatedAt: new Date(localTicket.updated_at).toISOString() }
      : undefined,
  })

  if (isLoading && !ticket) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text style={styles.errorText}>Ticket introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const statusColor = STATUS_COLOR[ticket.statut] ?? colors.textMuted
  const currentStep = STEP_ORDER.indexOf(ticket.statut)

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Statut badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[ticket.statut] ?? ticket.statut}
          </Text>
        </View>

        {/* Infos principales */}
        <Text style={styles.categorie}>{ticket.categorieService}</Text>
        <Text style={styles.commune}>
          <Ionicons name="location-outline" size={14} /> {ticket.commune}
        </Text>
        <Text style={styles.date}>{formatDate(new Date(ticket.createdAt).getTime())}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>{ticket.description}</Text>

        {/* Timeline */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Suivi</Text>
        <View style={styles.timeline}>
          {STEP_ORDER.map((step, i) => {
            const done    = i <= currentStep
            const current = i === currentStep && ticket.statut !== 'RESOLU'
            return (
              <View key={step} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    done ? { backgroundColor: statusColor } : { backgroundColor: colors.border },
                    current && styles.timelineDotCurrent,
                  ]}>
                    {done && !current && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  {i < STEP_ORDER.length - 1 && (
                    <View style={[styles.timelineLine, done && i < currentStep ? { backgroundColor: statusColor } : {}]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, !done && styles.timelineLabelMuted]}>
                  {STATUS_LABEL[step] ?? step}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Agent / Prestataire */}
        {(ticket as any).agent && (
          <View style={styles.agentCard}>
            <Ionicons name="headset-outline" size={20} color={colors.primary} />
            <View style={styles.agentInfo}>
              <Text style={styles.agentRole}>Agent</Text>
              <Text style={styles.agentName}>{(ticket as any).agent.prenom}</Text>
            </View>
          </View>
        )}

        {(ticket as any).provider && (
          <View style={styles.agentCard}>
            <Ionicons name="construct-outline" size={20} color={colors.success} />
            <View style={styles.agentInfo}>
              <Text style={styles.agentRole}>Prestataire assigné</Text>
              <Text style={styles.agentName}>{(ticket as any).provider.prenom}</Text>
              <Text style={styles.agentPhone}>{(ticket as any).provider.telephone}</Text>
            </View>
          </View>
        )}

        {localTicket && !localTicket.synced && (
          <View style={styles.syncBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
            <Text style={styles.syncText}>En attente de synchronisation</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { fontSize: font.base, color: colors.textMuted },
  backLink: { color: colors.primary, fontWeight: '600' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, marginBottom: spacing.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: font.sm, fontWeight: '700' },
  categorie: { fontSize: font.xl, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  commune: { fontSize: font.base, color: colors.textSecond, marginBottom: 2 },
  date: { fontSize: font.sm, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionLabel: { fontSize: font.sm, fontWeight: '700', color: colors.textSecond, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  description: { fontSize: font.base, color: colors.textPrimary, lineHeight: 24 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotCurrent: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  timelineLine: { width: 2, height: 32, backgroundColor: colors.border, marginTop: -2 },
  timelineLabel: { fontSize: font.base, color: colors.textPrimary, paddingTop: 1, paddingBottom: spacing.md },
  timelineLabelMuted: { color: colors.textMuted },
  agentCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginTop: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  agentInfo: { flex: 1 },
  agentRole: { fontSize: font.sm, color: colors.textSecond },
  agentName: { fontSize: font.base, fontWeight: '700', color: colors.textPrimary },
  agentPhone: { fontSize: font.sm, color: colors.primary },
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: `${colors.warning}15`, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  syncText: { fontSize: font.sm, color: colors.warning, fontWeight: '600' },
})
