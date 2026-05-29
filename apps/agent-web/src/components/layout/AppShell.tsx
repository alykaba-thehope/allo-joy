import { useCallStore } from '@/stores/callStore'
import { useAgentStore } from '@/stores/agentStore'
import { useCallTimer } from '@/hooks/useCallTimer'
import { useSocket } from '@/lib/socket'
import { sendSocketMessage } from '@/lib/socket'
import { CitizenPanel } from '@/components/panels/CitizenPanel'
import { ScriptPanel } from '@/components/panels/ScriptPanel'
import { ResultsPanel } from '@/components/panels/ResultsPanel'

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  busy:      'En appel',
  break:     'Pause',
  offline:   'Hors ligne',
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  busy:      'bg-amber-500',
  break:     'bg-blue-500',
  offline:   'bg-slate-500',
}

export function AppShell() {
  const { prenom, role, status, setStatus, logout, accessToken } = useAgentStore()
  const { activeCall, callStartedAt, queue, acceptCall, endCall } = useCallStore()
  const timer = useCallTimer(callStartedAt)

  useSocket(accessToken)

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus)
    sendSocketMessage('agent:status', { status: newStatus })
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-4 h-12 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-joy-400 font-bold text-lg tracking-tight">Allô Joy</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-500 text-xs">Agent</span>
        </div>

        {/* Chronomètre d'appel */}
        {activeCall && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-ring" />
            <span className="font-mono text-sm font-bold text-red-300">{timer}</span>
            <button
              onClick={endCall}
              className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Raccrocher
            </button>
          </div>
        )}

        {/* File d'attente */}
        {queue.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">File:</span>
            <div className="flex gap-1">
              {queue.map((call) => (
                <button
                  key={call.callId}
                  onClick={() => {
                    acceptCall(call)
                    useCallStore.getState().removeFromQueue(call.callId)
                    handleStatusChange('busy')
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-joy-900/40 border border-joy-600/40 rounded-lg text-xs text-joy-300 hover:bg-joy-900/60 animate-pulse-ring"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-joy-400" />
                  {call.citizenPhone.slice(-4)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Sélecteur de statut */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as typeof status)}
              className="bg-transparent text-xs text-slate-300 border-none outline-none cursor-pointer"
            >
              <option value="available">Disponible</option>
              <option value="busy">En appel</option>
              <option value="break">Pause</option>
            </select>
          </div>

          {/* Agent info */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{prenom}</span>
            <span className="text-slate-600">·</span>
            <span className="capitalize">{role}</span>
          </div>

          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── 3 Panneaux ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-2 p-2 overflow-hidden">
        {/* Panneau gauche — Citoyen (280px fixe) */}
        <div className="w-[280px] flex-shrink-0">
          <CitizenPanel />
        </div>

        {/* Panneau centre — Script guidé (flex) */}
        <div className="flex-1 min-w-0">
          <ScriptPanel />
        </div>

        {/* Panneau droit — Résultats (320px fixe) */}
        <div className="w-[320px] flex-shrink-0">
          <ResultsPanel />
        </div>
      </div>

      {/* ── Barre statut bas ────────────────────────────────────────────── */}
      <footer className="flex items-center gap-4 px-4 h-7 bg-slate-800/50 border-t border-slate-700/50 flex-shrink-0 text-xs text-slate-500">
        <span>{STATUS_LABELS[status]}</span>
        <span className="text-slate-700">·</span>
        <span>Allô Joy — Conakry, Guinée</span>
        <span className="ml-auto">v1.0.0</span>
      </footer>
    </div>
  )
}
