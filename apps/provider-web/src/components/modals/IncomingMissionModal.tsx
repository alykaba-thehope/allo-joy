import { useEffect, useState } from 'react'
import { useProviderStore } from '@/stores/providerStore'
import { sendMissionResponse } from '@/lib/socket'

const TIMEOUT_S = 30

const CATEGORIE_ICONS: Record<string, string> = {
  plomberie: '🔧', electricite: '⚡', transport: '🚗',
  sante: '🏥', menage: '🧹', jardinage: '🌿',
  peinture: '🎨', maconnerie: '🧱', informatique: '💻',
  cuisine: '🍳', autre: '🔨',
}

export function IncomingMissionModal() {
  const { incomingRequest, acceptMission, declineMission } = useProviderStore()
  const [remaining, setRemaining] = useState(TIMEOUT_S)

  useEffect(() => {
    if (!incomingRequest) return
    setRemaining(TIMEOUT_S)
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { declineMission(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [incomingRequest, declineMission])

  if (!incomingRequest) return null

  function onAccept() {
    sendMissionResponse(incomingRequest!.ticketId, true)
    acceptMission()
  }

  function onDecline() {
    sendMissionResponse(incomingRequest!.ticketId, false)
    declineMission()
  }

  const icon = CATEGORIE_ICONS[incomingRequest.categorieService] ?? '🔨'
  const pct  = (remaining / TIMEOUT_S) * 100

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm animate-fade-in">
      {/* Countdown bar */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-joy-500 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Animated icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-joy-600/20 border border-joy-600/30
                          flex items-center justify-center text-5xl">
            {icon}
          </div>
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full
                           flex items-center justify-center text-xs text-white font-bold animate-ping-slow">
            !
          </span>
        </div>

        <p className="text-slate-400 text-sm mb-1">Nouvelle mission</p>
        <h2 className="text-2xl font-bold text-white capitalize mb-1">
          {incomingRequest.categorieService}
        </h2>
        <p className="text-joy-400 font-medium mb-6">{incomingRequest.commune}</p>

        <div className="w-full card px-5 py-4 text-left mb-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Description</p>
          <p className="text-slate-200 text-sm leading-relaxed">{incomingRequest.description}</p>
        </div>

        {/* Countdown */}
        <p className="text-slate-500 text-sm mb-6">
          Expire dans{' '}
          <span className={`font-mono font-bold text-base ${remaining <= 10 ? 'text-red-400' : 'text-white'}`}>
            {remaining}s
          </span>
        </p>
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-8 flex gap-3">
        <button onClick={onDecline} className="flex-1 btn btn-lg btn-danger">
          ✗ Refuser
        </button>
        <button onClick={onAccept} className="flex-1 btn btn-lg btn-success">
          ✓ Accepter
        </button>
      </div>
    </div>
  )
}
