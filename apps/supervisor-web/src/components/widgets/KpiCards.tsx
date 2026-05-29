import { useSupervisorStore } from '@/stores/supervisorStore'

export function KpiCards() {
  const { kpi, agents, queue, activeCalls } = useSupervisorStore()

  const available  = agents.filter((a) => a.status === 'available').length
  const busy       = agents.filter((a) => a.status === 'busy').length
  const totalOnline = agents.filter((a) => a.status !== 'offline').length

  const cards = [
    {
      label: 'Appels aujourd\'hui',
      value: kpi.callsTotal,
      sub: `${kpi.callsResolved} résolus`,
      color: 'text-joy-400',
      bg: 'bg-joy-900/20 border-joy-700/30',
      icon: '📞',
    },
    {
      label: 'Taux de résolution',
      value: kpi.callsTotal > 0 ? `${Math.round(kpi.resolutionRate * 100)}%` : '—',
      sub: `Pic: ${kpi.peakHour}`,
      color: 'text-green-400',
      bg: 'bg-green-900/20 border-green-700/30',
      icon: '✅',
    },
    {
      label: 'File d\'attente',
      value: queue.length,
      sub: `${activeCalls.length} appel${activeCalls.length > 1 ? 's' : ''} actif${activeCalls.length > 1 ? 's' : ''}`,
      color: queue.length >= 5 ? 'text-red-400' : queue.length >= 3 ? 'text-amber-400' : 'text-slate-200',
      bg: queue.length >= 5 ? 'bg-red-900/20 border-red-700/30' : 'bg-slate-800 border-slate-700',
      icon: '⏳',
    },
    {
      label: 'Agents en ligne',
      value: totalOnline,
      sub: `${available} dispo · ${busy} en appel`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20 border-emerald-700/30',
      icon: '👥',
    },
    {
      label: 'Durée moy. appel',
      value: kpi.avgDurationSeconds > 0
        ? `${Math.floor(kpi.avgDurationSeconds / 60)}m${String(kpi.avgDurationSeconds % 60).padStart(2, '0')}s`
        : '—',
      sub: 'Objectif < 5 min',
      color: 'text-purple-400',
      bg: 'bg-purple-900/20 border-purple-700/30',
      icon: '⏱',
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.label} className={`card border ${card.bg} p-4 animate-fade-in`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xl">{card.icon}</span>
            <span className={`text-2xl font-bold tabular-nums ${card.color}`}>
              {card.value}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-300 leading-tight">{card.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
