import { useSupervisorStore } from '@/stores/supervisorStore'
import { useCallTimer } from '@/hooks/useCallTimer'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', pular: '🇬🇳', malinke: '🇬🇳', soussou: '🇬🇳',
}

const LANG_LABEL: Record<string, string> = {
  fr: 'FR', pular: 'PUL', malinke: 'MAL', soussou: 'SOU',
}

export function CallQueue() {
  const { queue, activeCalls } = useSupervisorStore()

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <span className="label">File d'attente & Appels actifs</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">{queue.length}</span> en attente ·{' '}
            <span className="text-green-400 font-semibold">{activeCalls.length}</span> actifs
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-700/40">
        {/* Appels en attente */}
        {queue.map((call) => (
          <WaitingCallRow key={call.callId} callId={call.callId} citizenPhone={call.citizenPhone} langue={call.langue} startedAt={call.startedAt} />
        ))}

        {/* Appels actifs */}
        {activeCalls.map((call) => (
          <ActiveCallRow
            key={call.callId}
            citizenPhone={call.citizenPhone}
            agentName={call.agentName ?? '—'}
            langue={call.langue}
            startedAt={call.startedAt}
          />
        ))}

        {queue.length === 0 && activeCalls.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <p className="text-2xl mb-1">📭</p>
              <p className="text-slate-500 text-sm">File vide</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WaitingCallRow({ citizenPhone, langue, startedAt }: { callId: string; citizenPhone: string; langue: string; startedAt: number }) {
  const elapsed = useCallTimer(startedAt)
  const isUrgent = Date.now() - startedAt > 180_000

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isUrgent ? 'bg-red-900/10' : ''}`}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
        <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
        <span className={`font-mono text-xs font-bold ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>{elapsed}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{citizenPhone}</p>
        <p className="text-xs text-slate-500">
          En attente · {formatDistanceToNow(new Date(startedAt), { addSuffix: true, locale: fr })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
          {LANG_FLAGS[langue] ?? '🌐'} {LANG_LABEL[langue] ?? langue}
        </span>
        {isUrgent && (
          <span className="text-xs bg-red-900/40 text-red-300 border border-red-700/40 px-1.5 py-0.5 rounded">
            +3 min
          </span>
        )}
      </div>
    </div>
  )
}

function ActiveCallRow({ citizenPhone, agentName, langue, startedAt }: { citizenPhone: string; agentName: string; langue: string; startedAt: number }) {
  const elapsed = useCallTimer(startedAt)
  const isLong = Date.now() - startedAt > 300_000

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isLong ? 'bg-amber-900/10' : ''}`}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className={`font-mono text-xs font-bold ${isLong ? 'text-amber-400' : 'text-green-400'}`}>{elapsed}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{citizenPhone}</p>
        <p className="text-xs text-slate-500">Agent: <span className="text-slate-300">{agentName}</span></p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
          {LANG_FLAGS[langue] ?? '🌐'} {LANG_LABEL[langue] ?? langue}
        </span>
        <button className="btn-ghost text-xs px-2 py-1">🎧 Écouter</button>
      </div>
    </div>
  )
}
