import { useState } from 'react'
import { useSupervisorStore } from '@/stores/supervisorStore'
import { useSocket } from '@/lib/socket'
import { KpiCards }     from '@/components/widgets/KpiCards'
import { AgentGrid }    from '@/components/widgets/AgentGrid'
import { CallQueue }    from '@/components/widgets/CallQueue'
import { AlertsPanel }  from '@/components/widgets/AlertsPanel'
import { HeatmapChart } from '@/components/charts/HeatmapChart'

type View = 'dashboard' | 'heatmap'

export function SupervisorShell() {
  const { prenom, alerts, logout, accessToken } = useSupervisorStore()
  const [view, setView] = useState<View>('dashboard')

  useSocket(accessToken)

  const activeAlerts = alerts.filter((a) => !a.dismissed).length

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-5 h-12 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-joy-400 tracking-tight">Allô Joy</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-400 text-xs">Superviseur</span>
        </div>

        <nav className="flex gap-1 ml-4">
          {([
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'heatmap',   label: '🗺️ Carte de chaleur' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === tab.id
                  ? 'bg-joy-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {/* Badge alertes */}
          {activeAlerts > 0 && (
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1.5 px-2 py-1 bg-red-900/40 border border-red-700/40 rounded-lg text-xs text-red-300 animate-pulse-slow"
            >
              🚨 {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''}
            </button>
          )}

          <span className="text-xs text-slate-400">
            <span className="font-medium text-slate-200">{prenom}</span>
            <span className="text-slate-600 mx-1">·</span>
            Superviseur
          </span>

          <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Contenu ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === 'dashboard' ? <DashboardView /> : <HeatmapView />}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="flex items-center gap-3 px-5 h-6 bg-slate-800/50 border-t border-slate-700/50 flex-shrink-0 text-xs text-slate-600">
        <span>Allô Joy · Conakry, Guinée</span>
        <span className="ml-auto">Mise à jour toutes les 5 min · v1.0.0</span>
      </footer>
    </div>
  )
}

function DashboardView() {
  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-hidden">
      {/* KPI row */}
      <div className="flex-shrink-0">
        <KpiCards />
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* File d'attente — 4 cols */}
        <div className="col-span-4 min-h-0">
          <CallQueue />
        </div>

        {/* Grille agents — 5 cols */}
        <div className="col-span-5 min-h-0">
          <AgentGrid />
        </div>

        {/* Alertes — 3 cols */}
        <div className="col-span-3 min-h-0">
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}

function HeatmapView() {
  return (
    <div className="h-full p-3">
      <HeatmapChart />
    </div>
  )
}
