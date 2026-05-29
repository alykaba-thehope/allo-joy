import { useCallStore } from '@/stores/callStore'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', pular: 'Pular', malinke: 'Malinké', soussou: 'Soussou',
}

const COMMUNE_COLORS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'yellow'> = {
  Ratoma: 'blue', Matoto: 'green', Matam: 'amber', Dixinn: 'yellow', Kaloum: 'red',
}

export function CitizenPanel() {
  const { citizen, activeCall } = useCallStore()

  if (!activeCall) {
    return (
      <div className="panel h-full rounded-l-xl">
        <div className="panel-header">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Citoyen</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 text-sm">En attente d'un appel</p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel h-full rounded-l-xl animate-slide-in">
      {/* Header */}
      <div className="panel-header">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Citoyen</span>
        <span className="text-xs font-mono text-joy-400">{activeCall.citizenPhone}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Identité */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">
                {citizen?.prenom
                  ? `${citizen.prenom}${citizen.nomFamille ? ' ' + citizen.nomFamille : ''}`
                  : <span className="text-slate-400 italic">Inconnu</span>
                }
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">{activeCall.citizenPhone}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {citizen?.commune && (
                <Badge variant={COMMUNE_COLORS[citizen.commune] ?? 'default'}>
                  {citizen.commune}
                </Badge>
              )}
              {citizen?.languePreferee && (
                <Badge variant="blue">{LANG_LABELS[citizen.languePreferee]}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        {citizen && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{citizen.nbDemandesTotales}</p>
              <p className="text-xs text-slate-400 mt-0.5">demandes totales</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {citizen.tickets?.length ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">récentes</p>
            </div>
          </div>
        )}

        {/* Notes agent */}
        {citizen?.notes && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-400 mb-1">Notes</p>
            <p className="text-sm text-amber-200">{citizen.notes}</p>
          </div>
        )}

        {/* Historique */}
        {citizen?.tickets && citizen.tickets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Historique
            </p>
            <div className="space-y-2">
              {(citizen.tickets as Array<{
                id: string
                categorieService: string
                statut: string
                createdAt: string
              }>).map((t) => (
                <div key={t.id} className="bg-slate-700/40 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-200">{t.categorieService}</span>
                    <StatusDot statut={t.statut} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nouveau citoyen */}
        {!citizen && (
          <div className="bg-slate-700/30 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400">Premier contact</p>
            <p className="text-xs text-slate-500 mt-1">La fiche sera créée avec le ticket</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDot({ statut }: { statut: string }) {
  const colors: Record<string, string> = {
    OUVERT:           'bg-blue-400',
    EN_COURS:         'bg-amber-400',
    MISE_EN_RELATION: 'bg-purple-400',
    RESOLU:           'bg-green-400',
    CLOTURE:          'bg-slate-500',
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[statut] ?? 'bg-slate-500'}`} />
      {statut}
    </span>
  )
}
