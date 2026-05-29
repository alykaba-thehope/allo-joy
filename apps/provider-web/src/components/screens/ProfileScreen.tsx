import { useProviderStore } from '@/stores/providerStore'

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', pular: 'Pular', malinke: 'Malinké', soussou: 'Soussou',
}

const CATEGORIE_ICONS: Record<string, string> = {
  plomberie: '🔧', electricite: '⚡', transport: '🚗',
  sante: '🏥', menage: '🧹', jardinage: '🌿',
  peinture: '🎨', maconnerie: '🧱', informatique: '💻',
  cuisine: '🍳', autre: '🔨',
}

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white text-sm font-semibold w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

export function ProfileScreen() {
  const {
    prenom, nomFamille, telephone, categorieService, langues,
    noteMoyenne, tauxReussite, totalMissions, logout,
  } = useProviderStore()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <h2 className="text-lg font-bold text-white">Profil</h2>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* Avatar + name */}
        <div className="card px-5 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-joy-600/20 border border-joy-600/30
                          flex items-center justify-center text-2xl flex-shrink-0">
            {CATEGORIE_ICONS[categorieService ?? 'autre'] ?? '🔨'}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{prenom} {nomFamille}</p>
            <p className="text-slate-400 text-sm capitalize">{categorieService ?? '—'}</p>
            <p className="text-slate-500 text-xs mt-0.5">{telephone}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="card px-5 py-4 space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Note moyenne</p>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl font-bold text-white">{noteMoyenne.toFixed(1)}</span>
            <span className="text-slate-500 text-sm">/ 5</span>
            <span className="text-amber-400 text-lg ml-1">
              {'★'.repeat(Math.round(noteMoyenne))}{'☆'.repeat(5 - Math.round(noteMoyenne))}
            </span>
          </div>
          <RatingBar value={noteMoyenne} />
        </div>

        {/* Stats */}
        <div className="card px-5 py-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pt-3 pb-2">Statistiques</p>
          <StatRow label="Missions réalisées" value={String(totalMissions)} />
          <StatRow label="Taux de réussite"    value={`${Math.round(tauxReussite * 100)}%`} />
          <StatRow label="Note moyenne"         value={`${noteMoyenne.toFixed(1)} / 5`} />
        </div>

        {/* Languages */}
        {langues.length > 0 && (
          <div className="card px-5 py-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Langues</p>
            <div className="flex flex-wrap gap-2">
              {langues.map((l) => (
                <span key={l} className="badge bg-slate-700 text-slate-300 px-3 py-1">
                  {LANG_LABELS[l] ?? l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full btn btn-md bg-red-900/30 hover:bg-red-900/50 text-red-400
                     border border-red-800/40 mt-2"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}
