import { useState } from 'react'
import { useSupervisorStore } from '@/stores/supervisorStore'

export function LoginPage() {
  const { setAuth } = useSupervisorStore()
  const [step, setStep]     = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone]   = useState('')
  const [otp, setOtp]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phone }),
      })
      setStep('otp')
    } catch { setError('Erreur réseau') }
    finally   { setLoading(false) }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phone, otp }),
      })
      if (!res.ok) { setError('Code incorrect'); return }
      const data = await res.json() as { accessToken: string; agent: { prenom: string; role: string } }
      if (!['superviseur', 'admin', 'directeur'].includes(data.agent.role)) {
        setError('Accès superviseur requis')
        return
      }
      setAuth(data.accessToken, data.agent.prenom)
    } catch { setError('Erreur réseau') }
    finally   { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-joy-400 tracking-tight">Allô Joy</h1>
          <p className="text-slate-400 text-sm mt-1">Dashboard Superviseur</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Numéro superviseur</label>
                <input type="tel" autoFocus value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-joy-500"
                  placeholder="+224 6XX XXX XXX" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading || !phone}
                className="w-full py-2.5 bg-joy-600 hover:bg-joy-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Envoi...' : 'Recevoir le code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">Code reçu par SMS</label>
                  <button type="button" onClick={() => setStep('phone')} className="text-xs text-slate-500 hover:text-slate-300">← Retour</button>
                </div>
                <input type="text" inputMode="numeric" maxLength={6} autoFocus value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-xl font-mono text-center tracking-[0.5em] text-slate-100 focus:outline-none focus:ring-2 focus:ring-joy-500"
                  placeholder="• • • • • •" />
              </div>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-joy-600 hover:bg-joy-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Vérification...' : 'Accéder au dashboard'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
