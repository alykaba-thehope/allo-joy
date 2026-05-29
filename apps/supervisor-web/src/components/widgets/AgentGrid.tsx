import { useState } from 'react'
import { useSupervisorStore, type LiveAgent } from '@/stores/supervisorStore'
import { useCallTimer } from '@/hooks/useCallTimer'

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  busy:      'En appel',
  break:     'Pause',
  offline:   'Hors ligne',
}

const STATUS_COLOR: Record<string, string> = {
  available: 'text-green-400',
  busy:      'text-amber-400',
  break:     'text-blue-400',
  offline:   'text-slate-500',
}

const STATUS_BG: Record<string, string> = {
  available: 'border-green-700/30 bg-green-900/10',
  busy:      'border-amber-700/30 bg-amber-900/10',
  break:     'border-blue-700/30 bg-blue-900/10',
  offline:   'border-slate-700/30 bg-slate-800/30',
}

export function AgentGrid() {
  const { agents } = useSupervisorStore()
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? agents : agents.filter((a) => a.status === filter)
  const counts = {
    all:       agents.length,
    available: agents.filter((a) => a.status === 'available').length,
    busy:      agents.filter((a) => a.status === 'busy').length,
    break:     agents.filter((a) => a.status === 'break').length,
    offline:   agents.filter((a) => a.status === 'offline').length,
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <span className="label">Agents</span>
        <div className="flex gap-1">
          {(['all', 'available', 'busy', 'break', 'offline'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                filter === s ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
              <span className="ml-1 text-slate-500">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 flex items-center justify-center py-8">
            <p className="text-slate-500 text-sm">Aucun agent</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: LiveAgent }) {
  const timer = useCallTimer(agent.status === 'busy' ? agent.callStartedAt : null)

  return (
    <div className={`border rounded-xl p-3 transition-colors ${STATUS_BG[agent.status]}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">
            {agent.prenom} {agent.nomFamille}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`status-dot-${agent.status}`} />
            <span className={`text-xs ${STATUS_COLOR[agent.status]}`}>
              {STATUS_LABEL[agent.status]}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-slate-400 font-medium">{agent.ticketsToday} tickets</span>
          {agent.status === 'busy' && (
            <span className="font-mono text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
              {timer}
            </span>
          )}
        </div>
      </div>

      {/* Langues */}
      <div className="flex flex-wrap gap-1">
        {agent.langue.map((l) => (
          <span key={l} className="text-xs bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">
            {l}
          </span>
        ))}
      </div>

      {/* Alerte : inactif depuis > 2 min (L3-013) */}
      {agent.status === 'available' && agent.lastSeenAt && Date.now() - agent.lastSeenAt > 120_000 && (
        <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
          <span>⚠</span> Inactif {Math.floor((Date.now() - agent.lastSeenAt) / 60_000)} min
        </div>
      )}
    </div>
  )
}
