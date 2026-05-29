import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { auth } from '../../src/lib/api'
import { useCitizenStore } from '../../src/stores/citizenStore'
import { colors, spacing, radius, font } from '../../src/theme'

const CODE_LENGTH = 6

export default function OtpScreen() {
  const { telephone } = useLocalSearchParams<{ telephone: string }>()
  const setAuth = useCitizenStore(s => s.setAuth)

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const inputRefs = useRef<TextInput[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (digit && index === CODE_LENGTH - 1) {
      verify(next.join(''))
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ''
      setDigits(next)
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function verify(code: string) {
    if (code.length !== CODE_LENGTH) return
    setLoading(true)
    try {
      const data = await auth.verifyOtp(telephone!, code)
      setAuth({
        id: data.id,
        telephone: telephone!,
        prenom: data.prenom,
        nomFamille: data.nomFamille,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      })
      router.replace('/(tabs)/')
    } catch {
      Alert.alert('Code incorrect', 'Le code saisi est invalide ou expiré. Réessayez.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (resendCooldown > 0) return
    try {
      await auth.requestOtp(telephone!)
      setResendCooldown(60)
      Alert.alert('SMS envoyé', 'Un nouveau code vous a été envoyé.')
    } catch {
      Alert.alert('Erreur', 'Impossible de renvoyer le code.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Code de vérification</Text>
        <Text style={styles.subtitle}>
          Saisissez le code envoyé au{'\n'}
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{telephone}</Text>
        </Text>
      </View>

      <View style={styles.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={ref => { if (ref) inputRefs.current[i] = ref }}
            style={[styles.digitInput, d ? styles.digitFilled : null]}
            value={d}
            onChangeText={v => handleDigit(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={i === 0}
          />
        ))}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Vérification en cours…</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.resendBtn, resendCooldown > 0 && styles.resendDisabled]}
        onPress={resend}
        disabled={resendCooldown > 0}
      >
        <Text style={styles.resendText}>
          {resendCooldown > 0
            ? `Renvoyer le code (${resendCooldown}s)`
            : 'Renvoyer le code'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingTop: 60,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: font.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: font.base,
    color: colors.textSecond,
    lineHeight: 22,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  digitInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: 'center',
    fontSize: font.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  digitFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadingText: {
    color: colors.textSecond,
    fontSize: font.base,
  },
  resendBtn: {
    alignItems: 'center',
    padding: spacing.md,
  },
  resendDisabled: { opacity: 0.4 },
  resendText: {
    color: colors.primary,
    fontSize: font.base,
    fontWeight: '600',
  },
})
