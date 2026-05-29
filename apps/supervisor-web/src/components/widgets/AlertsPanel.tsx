import { useSupervisorStore } from '@/stores/supervisorStore'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const ICON: Record<string, string> = { warning: '⚠️', danger: '🚨', info: 'ℹ️' }

export function AlertsPanel() {
  const { alerts, dismissAlert } = useSupervisorStore()
  const active = alerts.filter((a) => !a.dismissed)

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <span className="label">Alertes</span>
        {active.length > 0 && (
          <span className="text-xs bg-red-900/40 text-red-300 border border-red-700/40 px-2 py-0.5 rounded-full font-semibold">
            {active.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {active.map((alert) => (
          <div key={alert.id} className={`alert-${alert.type} animate-fade-in`}>
            <span className="text-base flex-shrink-0 mt-0.5">{ICON[alert.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                alert.type === 'danger'  ? 'text-red-300' :
                alert.type === 'warning' ? 'text-amber-300' :
                                           'text-blue-300'
              }`}>
                {alert.message}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })}
              </p>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}

        {active.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-2xl mb-1">✓</p>
            <p className="text-slate-500 text-sm">Aucune alerte active</p>
          </div>
        )}
      </div>
    </div>
  )
}
