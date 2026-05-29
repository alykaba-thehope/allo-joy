import { useProviderStore, type ProviderStatus } from '@/stores/providerStore'
import { useElapsed } from '@/hooks/useElapsed'
import { sendStatus } from '@/lib/socket'

const STATUS_CONFIG: Record<ProviderStatus, { label: string; dot: string; bg: string; next: ProviderStatus }> = {
  disponible: { label: 'Disponible',  dot: 'bg-green-400', bg: 'status-disponible', next: 'occupe'     },
  occupe:     { label: 'Occupé',      dot: 'bg-amber-400', bg: 'status-occupe',     next: 'hors_ligne' },
  hors_ligne: { label: 'Hors ligne',  dot: 'bg-slate-500', bg: 'status-hors-ligne', next: 'disponible' },
}

const CATEGORIE_ICONS: Record<string, string> = {
  plomberie:   '🔧', electricite: '⚡', transport:   '🚗',
  sante:       '🏥', menage:      '🧹', jardinage:   '🌿',
  peinture:    '🎨', maconnerie:  '🧱', informatique:'💻',
  cuisine:     '🍳', autre:       '🔨',
}

export function HomeScreen() {
  const {
    prenom, categorieService, status, setStatus,
    noteMoyenne, tauxReussite, totalMissions, missionsToday, currentMission,
  } = useProviderStore()

  function cycleStatus() {
    const next = STATUS_CONFIG[status].next
    setStatus(next)
    sendStatus(next)
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Bonjour,</p>
          <h2 className="text-xl font-bold text-white">{prenom}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="text-xl">{CATEGORIE_ICONS[categorieService ?? 'autre'] ?? '🔨'}</span>
          <span className="capitalize">{categorieService ?? '—'}</span>
        </div>
      </div>

      {/* Status toggle */}
      <button
        onClick={cycleStatus}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border
                    transition-all active:scale-[0.98] ${cfg.bg}`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${cfg.dot} ${status === 'disponible' ? 'animate-pulse' : ''}`} />
          <span className="font-semibold text-lg">{cfg.label}</span>
        </div>
        <span className="text-xs opacity-60">Appuyer pour changer →</span>
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="⭐" value={noteMoyenne.toFixed(1)} label="Note" />
        <StatCard icon="✅" value={`${Math.round(tauxReussite * 100)}%`} label="Réussite" />
        <StatCard icon="📋" value={String(missionsToday)} label="Aujourd'hui" />
      </div>

      {/* Active mission */}
      {currentMission ? (
        <ActiveMissionCard />
      ) : (
        <div className="card px-5 py-10 flex flex-col items-center text-center gap-2">
          {status === 'disponible' ? (
            <>
              <div className="relative">
                <span className="text-4xl">📡</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping-slow" />
              </div>
              <p className="text-white font-medium mt-2">En attente de missions</p>
              <p className="text-slate-500 text-sm">Vous serez notifié dès qu'une demande arrive</p>
            </>
          ) : (
            <>
              <span className="text-4xl">😴</span>
              <p className="text-white font-medium mt-2">Vous êtes {cfg.label.toLowerCase()}</p>
              <p className="text-slate-500 text-sm">Passez en "Disponible" pour recevoir des missions</p>
            </>
          )}
        </div>
      )}

      {/* Total missions */}
      <div className="card px-5 py-3 flex items-center justify-between">
        <span className="text-slate-400 text-sm">Missions totales</span>
        <span className="text-white font-semibold">{totalMissions}</span>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="card px-3 py-3 flex flex-col items-center gap-1">
      <span className="text-xl">{icon}</span>
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )
}

function ActiveMissionCard() {
  const { currentMission, completeMission } = useProviderStore()
  const elapsed = useElapsed(currentMission?.assignedAt ?? null)
  if (!currentMission) return null

  return (
    <div className="card border-amber-500/40 bg-amber-900/10 px-5 py-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-sm font-semibold">Mission en cours</span>
        </div>
        <span className="font-mono text-amber-400 text-sm font-bold">{elapsed}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORIE_ICONS[currentMission.categorieService] ?? '🔨'}</span>
          <span className="text-white font-medium capitalize">{currentMission.categorieService}</span>
          <span className="text-slate-500 text-xs">· {currentMission.commune}</span>
        </div>
        <p className="text-slate-300 text-sm line-clamp-2">{currentMission.description}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <a
          href={`tel:${currentMission.citizenPhone}`}
          className="flex-1 btn btn-md bg-slate-700 hover:bg-slate-600 text-white"
        >
          📞 Appeler
        </a>
        <a
          href={`sms:${currentMission.citizenPhone}`}
          className="flex-1 btn btn-md bg-slate-700 hover:bg-slate-600 text-white"
        >
          💬 SMS
        </a>
        <button
          onClick={completeMission}
          className="flex-1 btn btn-md btn-success"
        >
          ✓ Terminé
        </button>
      </div>
    </div>
  )
}
