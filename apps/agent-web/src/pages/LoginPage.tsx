import { useState } from 'react'
import { authApi } from '@/lib/api'
import { useAgentStore } from '@/stores/agentStore'
import { Spinner } from '@/components/ui/Spinner'

type LoginStep = 'phone' | 'otp'

export function LoginPage() {
  const { setAgent, setToken } = useAgentStore()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return
    setError('')
    setLoading(true)
    try {
      await authApi.requestOtp(phone)
      setStep('otp')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(phone, otp)
      setToken(res.accessToken)
      setAgent(res.agent)
    } catch (err) {
      setError('Code incorrect ou expiré')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-joy-400 tracking-tight">Allô Joy</h1>
          <p className="text-slate-400 text-sm mt-2">Interface Agent — Conakry, Guinée</p>
        </div>

        {/* Formulaire */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+224 6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || !phone} className="btn-primary w-full">
                {loading ? <Spinner className="w-4 h-4" /> : null}
                {loading ? 'Envoi...' : 'Recevoir le code SMS'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">
                    Code reçu par SMS
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setError('') }}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Changer le numéro
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="input text-center text-xl font-mono tracking-[0.5em] h-14"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1.5 text-center">
                  Code envoyé au {phone}
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                {loading ? <Spinner className="w-4 h-4" /> : null}
                {loading ? 'Vérification...' : 'Se connecter'}
              </button>

              <button
                type="button"
                onClick={() => authApi.requestOtp(phone)}
                className="btn-ghost w-full text-xs"
              >
                Renvoyer le code
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          © 2025 Allô Joy · contact@allojoy.gn
        </p>
      </div>
    </div>
  )
}
