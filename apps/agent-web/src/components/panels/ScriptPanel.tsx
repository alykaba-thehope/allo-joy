import { useState } from 'react'
import { useCallStore } from '@/stores/callStore'
import { ticketApi, providerApi } from '@/lib/api'
import { useAgentStore } from '@/stores/agentStore'
import { Spinner } from '@/components/ui/Spinner'

const CATEGORIES = [
  { id: 'plomberie',       label: 'Plomberie',        icon: '🔧' },
  { id: 'electricite',     label: 'Électricité',       icon: '⚡' },
  { id: 'maconnerie',      label: 'Maçonnerie',        icon: '🏗️' },
  { id: 'sante',           label: 'Santé',             icon: '🏥' },
  { id: 'transport',       label: 'Transport',         icon: '🚕' },
  { id: 'informatique',    label: 'Informatique',      icon: '💻' },
  { id: 'menage',          label: 'Ménage',            icon: '🧹' },
  { id: 'gardiennage',     label: 'Gardiennage',       icon: '🔒' },
  { id: 'localisation',    label: 'Localisation / GPS',icon: '📍' },
  { id: 'information',     label: 'Information',       icon: 'ℹ️' },
  { id: 'autre',           label: 'Autre',             icon: '📋' },
]

const COMMUNES = ['Ratoma', 'Matoto', 'Matam', 'Dixinn', 'Kaloum']
const LANGUES  = [
  { id: 'fr',      label: 'Français' },
  { id: 'pular',   label: 'Pular' },
  { id: 'malinke', label: 'Malinké' },
  { id: 'soussou', label: 'Soussou' },
]

type Step = 'categorie' | 'detail' | 'ticket'

export function ScriptPanel() {
  const { activeCall, currentTicket, ticketId, setTicketField, setProviders, setRightPanel } = useCallStore()
  const agentId = useAgentStore((s) => s.id)
  const citizenPhone = activeCall?.citizenPhone

  const [step, setStep] = useState<Step>('categorie')
  const [saving, setSaving] = useState(false)
  const [callbackDate, setCallbackDate] = useState('')
  const [schedulingCallback, setSchedulingCallback] = useState(false)

  if (!activeCall) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Script guidé</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">📞</p>
            <p className="text-slate-400 text-sm">Aucun appel actif</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSelectCategory = (categoryId: string) => {
    setTicketField('categorieService', categoryId)
    setProviders([], true)
    setRightPanel('providers')

    // Déclencher la recherche de prestataires
    const commune = currentTicket?.commune as string | undefined
    if (commune) {
      providerApi.search({ categorie: categoryId, commune, available: true })
        .then((res) => {
          setProviders((res.data ?? []) as Parameters<typeof setProviders>[0])
        })
        .catch(() => setProviders([]))
    }

    setStep('detail')
  }

  const handleCreateTicket = async () => {
    if (!citizenPhone || !agentId || !currentTicket?.categorieService) return
    setSaving(true)
    try {
      const result = await ticketApi.create({
        citizenPhone,
        agentId,
        categorieService: currentTicket.categorieService,
        commune: currentTicket.commune,
        langue: currentTicket.langue ?? 'fr',
        descriptionBesoin: (currentTicket as Record<string, string>).descriptionBesoin ?? '',
        callId: activeCall.callId,
      })
      useCallStore.setState({ ticketId: result.id })
      setStep('ticket')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleCallback = async () => {
    if (!ticketId || !callbackDate) return
    setSchedulingCallback(true)
    try {
      await ticketApi.scheduleCallback(ticketId, new Date(callbackDate).toISOString())
      setCallbackDate('')
    } finally {
      setSchedulingCallback(false)
    }
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Script guidé</span>
        {/* Sélecteur de langue rapide */}
        <div className="flex gap-1">
          {LANGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => setTicketField('langue', l.id)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                currentTicket?.langue === l.id
                  ? 'bg-joy-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Étape 1 — Catégorie */}
        {step === 'categorie' && (
          <div className="animate-slide-in">
            <p className="text-sm font-medium text-slate-300 mb-3">
              Quel est le besoin du citoyen ?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className="flex items-center gap-3 p-3 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 hover:border-joy-600/50 rounded-xl text-sm font-medium text-slate-200 transition-all text-left group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2 — Détails */}
        {step === 'detail' && (
          <div className="animate-slide-in space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep('categorie')} className="btn-ghost px-2 py-1 text-xs">
                ← Retour
              </button>
              <span className="text-sm font-medium text-white">
                {CATEGORIES.find((c) => c.id === currentTicket?.categorieService)?.icon}{' '}
                {CATEGORIES.find((c) => c.id === currentTicket?.categorieService)?.label}
              </span>
            </div>

            {/* Commune */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Commune d'intervention
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMUNES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setTicketField('commune', c)
                      // Relancer la recherche avec la commune
                      if (currentTicket?.categorieService) {
                        providerApi.search({ categorie: currentTicket.categorieService as string, commune: c, available: true })
                          .then((res) => setProviders((res.data ?? []) as Parameters<typeof setProviders>[0]))
                          .catch(() => {})
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      currentTicket?.commune === c
                        ? 'bg-joy-600 border-joy-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-joy-600/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Description du besoin
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Décrire brièvement la demande..."
                value={(currentTicket as Record<string, string>)?.descriptionBesoin ?? ''}
                onChange={(e) => setTicketField('descriptionBesoin', e.target.value)}
              />
            </div>

            <button
              onClick={handleCreateTicket}
              disabled={saving || !currentTicket?.categorieService}
              className="btn-primary w-full"
            >
              {saving ? <Spinner className="w-4 h-4" /> : null}
              {saving ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        )}

        {/* Étape 3 — Ticket créé */}
        {step === 'ticket' && (
          <div className="animate-slide-in space-y-4">
            {/* Confirmation */}
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-medium text-green-300">Ticket créé</p>
                <p className="text-xs text-green-400/70 font-mono mt-0.5">
                  #{ticketId?.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </p>

              <button
                onClick={() => setRightPanel('providers')}
                className="btn-secondary w-full justify-start gap-3"
              >
                <span>👥</span> Voir les prestataires matchés
              </button>

              <button
                onClick={() => setRightPanel('map')}
                className="btn-secondary w-full justify-start gap-3"
              >
                <span>🗺️</span> Ouvrir la carte
              </button>

              {ticketId && (
                <button
                  onClick={() => ticketApi.updateStatus(ticketId, 'MISE_EN_RELATION')}
                  className="btn-primary w-full justify-start gap-3"
                >
                  <span>🔗</span> Confirmer la mise en relation
                </button>
              )}
            </div>

            {/* Programmation rappel */}
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Programmer un rappel de vérification
              </p>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  className="input flex-1 text-xs"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button
                  onClick={handleScheduleCallback}
                  disabled={!callbackDate || schedulingCallback}
                  className="btn-secondary px-3 text-xs flex-shrink-0"
                >
                  {schedulingCallback ? <Spinner className="w-3 h-3" /> : '📅'}
                </button>
              </div>
            </div>

            {/* Clôturer */}
            {ticketId && (
              <button
                onClick={() => ticketApi.updateStatus(ticketId, 'RESOLU')}
                className="btn-ghost w-full text-green-400 hover:text-green-300 hover:bg-green-900/20"
              >
                Marquer comme résolu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
