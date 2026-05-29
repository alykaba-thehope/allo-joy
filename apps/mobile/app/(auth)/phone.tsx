import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { auth } from '../../src/lib/api'
import { colors, spacing, radius, font } from '../../src/theme'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+224')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    const normalized = phone.trim()
    if (normalized.length < 12) {
      Alert.alert('Numéro invalide', 'Saisissez un numéro guinéen valide (+224XXXXXXXXX)')
      return
    }
    setLoading(true)
    try {
      await auth.requestOtp(normalized)
      router.push({ pathname: '/(auth)/otp', params: { telephone: normalized } })
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d\'envoyer le SMS')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.logoRing}>
          <Ionicons name="call" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Allô Joy</Text>
        <Text style={styles.subtitle}>Services citoyens · Conakry</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Votre numéro de téléphone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+224 6XX XXX XXX"
          placeholderTextColor={colors.textMuted}
          maxLength={15}
          autoFocus
        />
        <Text style={styles.hint}>
          Vous recevrez un code SMS à 6 chiffres.
        </Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Recevoir le code</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        En continuant, vous acceptez nos conditions d'utilisation.
      </Text>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: font.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: font.base,
    color: colors.textSecond,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.textSecond,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.lg,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  hint: {
    fontSize: font.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: font.md,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: font.sm,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
})
