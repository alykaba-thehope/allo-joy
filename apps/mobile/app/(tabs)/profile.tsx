import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCitizenStore } from '../../src/stores/citizenStore'
import { useQuery } from '@tanstack/react-query'
import { getAllTickets } from '../../src/lib/db'
import { colors, spacing, radius, font } from '../../src/theme'

export default function ProfileScreen() {
  const { prenom, nomFamille, telephone, logout } = useCitizenStore()

  const { data: tickets = [] } = useQuery({ queryKey: ['tickets-local'], queryFn: getAllTickets })
  const resolved = tickets.filter(t => t.statut === 'RESOLU').length
  const pending  = tickets.filter(t => ['OUVERT', 'EN_COURS', 'MISE_EN_RELATION'].includes(t.statut)).length

  function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/phone') } },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {prenom ? prenom[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.name}>
            {prenom ? `${prenom} ${nomFamille ?? ''}`.trim() : 'Citoyen'}
          </Text>
          <Text style={styles.phone}>{telephone}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{tickets.length}</Text>
            <Text style={styles.statLabel}>Tickets total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{pending}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.success }]}>{resolved}</Text>
            <Text style={styles.statLabel}>Résolus</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <MenuItem icon="language-outline" label="Langue" value="Français" onPress={() => {}} />
          <MenuItem icon="information-circle-outline" label="À propos" onPress={() => {}} />
          <MenuItem icon="shield-checkmark-outline" label="Confidentialité" onPress={() => {}} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Allô Joy v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuItem({ icon, label, value, onPress }: {
  icon: string; label: string; value?: string; onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={20} color={colors.textSecond} />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: colors.primary },
  name: { fontSize: font.xl, fontWeight: '700', color: colors.textPrimary },
  phone: { fontSize: font.base, color: colors.textSecond, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: font.xl, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  menu: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: font.base, color: colors.textPrimary },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  menuValue: { fontSize: font.sm, color: colors.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: `${colors.danger}15`, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  logoutText: { fontSize: font.base, fontWeight: '600', color: colors.danger },
  version: { textAlign: 'center', fontSize: font.sm, color: colors.textMuted },
})
