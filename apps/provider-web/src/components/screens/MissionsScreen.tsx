import { useProviderStore, type MissionSummary, type MissionStatus } from '@/stores/providerStore'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_LABEL: Record<MissionStatus, { label: string; cls: string }> = {
  en_cours: { label: 'En cours', cls: 'bg-amber-500/20 text-amber-400' },
  termine:  { label: 'Terminée', cls: 'bg-green-500/20 text-green-400' },
  annule:   { label: 'Annulée',  cls: 'bg-slate-600/40 text-slate-400' },
  refuse:   { label: 'Refusée',  cls: 'bg-red-500/20  text-red-400'   },
}

const CATEGORIE_ICONS: Record<string, string> = {
  plomberie: '🔧', electricite: '⚡', transport: '🚗',
  sante: '🏥', menage: '🧹', jardinage: '🌿',
  peinture: '🎨', maconnerie: '🧱', informatique: '💻',
  cuisine: '🍳', autre: '🔨',
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

function MissionRow({ m }: { m: MissionSummary }) {
  const cfg = STATUS_LABEL[m.status]
  return (
    <div className="card px-4 py-3 space-y-2 animate-slide-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORIE_ICONS[m.categorieService] ?? '🔨'}</span>
          <div>
            <p className="text-white text-sm font-medium capitalize">{m.categorieService}</p>
            <p className="text-slate-500 text-xs">{m.commune}</p>
          </div>
        </div>
        <span className={`badge shrink-0 ${cfg.cls}`}>{cfg.label}</span>
      </div>

      <p className="text-slate-400 text-xs line-clamp-1">{m.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-slate-600 text-xs">
          {format(new Date(m.assignedAt), 'dd MMM yyyy · HH:mm', { locale: fr })}
        </span>
        {m.noteRecue !== null ? <Stars n={m.noteRecue} /> : <span className="text-xs text-slate-600">—</span>}
      </div>
    </div>
  )
}

export function MissionsScreen() {
  const { missions, currentMission, missionsToday } = useProviderStore()
  const all = currentMission ? [currentMission, ...missions] : missions

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold text-white">Missions</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-white font-semibold">{missionsToday}</span> aujourd'hui ·{' '}
          <span className="text-white font-semibold">{all.length}</span> total
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-white font-medium">Aucune mission</p>
            <p className="text-slate-500 text-sm">Vos missions apparaîtront ici</p>
          </div>
        ) : (
          all.map((m) => <MissionRow key={m.id} m={m} />)
        )}
      </div>
    </div>
  )
}
