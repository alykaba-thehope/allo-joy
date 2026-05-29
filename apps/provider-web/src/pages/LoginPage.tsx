import { useState } from 'react'
import { useProviderStore } from '@/stores/providerStore'

type Step = 'phone' | 'otp'

export function LoginPage() {
  const setAuth = useProviderStore((s) => s.setAuth)
  const [step, setStep]       = useState<Step>('phone')
  const [phone, setPhone]     = useState('')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 9) { setError('Numéro invalide'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phone, role: 'prestataire' }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStep('otp')
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Code à 6 chiffres requis'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phone, code: otp, role: 'prestataire' }),
      })
      if (!res.ok) { setError('Code incorrect'); return }
      const data = await res.json() as {
        accessToken: string; prenom: string; nomFamille: string;
        telephone: string; categorieService: string; langues: string[];
        noteMoyenne: number; tauxReussite: number; totalMissions: number;
      }
      setAuth(data)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-joy-600/20 border border-joy-600/30 mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Allô Joy</h1>
          <p className="text-slate-400 text-sm mt-1">Espace Prestataire</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Numéro de téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+224 6XX XXX XXX"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
                           text-white placeholder-slate-500 focus:outline-none focus:border-joy-500
                           focus:ring-1 focus:ring-joy-500 transition-colors"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full btn btn-lg btn-primary disabled:opacity-50">
              {loading ? 'Envoi…' : 'Recevoir le code SMS'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Code envoyé au <span className="text-white font-medium">{phone}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="_ _ _ _ _ _"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-4
                         text-white text-center text-2xl tracking-[0.4em] font-mono
                         placeholder-slate-600 focus:outline-none focus:border-joy-500
                         focus:ring-1 focus:ring-joy-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full btn btn-lg btn-primary disabled:opacity-50">
              {loading ? 'Vérification…' : 'Connexion'}
            </button>
            <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
              className="w-full btn btn-md btn-ghost text-slate-400">
              ← Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
