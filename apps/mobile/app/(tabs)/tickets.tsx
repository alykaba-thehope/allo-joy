import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { getAllTickets, type DbTicket } from '../../src/lib/db'
import { fullSync } from '../../src/lib/sync'
import { STATUS_COLOR, STATUS_LABEL, colors, spacing, radius, font } from '../../src/theme'
import { formatDistanceToNow } from '../../src/lib/date'

export default function TicketsScreen() {
  const { data: tickets = [], refetch, isRefetching } = useQuery({
    queryKey: ['tickets-local'],
    queryFn: getAllTickets,
  })

  async function handleRefresh() {
    await fullSync()
    refetch()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes tickets</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/ticket/new')}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => <TicketCard ticket={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucun ticket pour le moment</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/ticket/new')}>
              <Text style={styles.emptyBtnText}>Créer un ticket</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

function TicketCard({ ticket }: { ticket: DbTicket }) {
  const statusColor = STATUS_COLOR[ticket.statut] ?? colors.textMuted
  const statusLabel = STATUS_LABEL[ticket.statut] ?? ticket.statut
  const date = formatDistanceToNow(ticket.created_at)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.categorie}>{ticket.categorie_nom}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{ticket.description}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{ticket.commune}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{date}</Text>
          {!ticket.synced && (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="cloud-offline-outline" size={12} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.warning }]}>Non synchronisé</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.textPrimary },
  newBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    marginBottom: spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  categorie: { fontSize: font.base, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: font.sm, color: colors.textSecond, lineHeight: 18, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  dot: { color: colors.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyText: { fontSize: font.base, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },
})
