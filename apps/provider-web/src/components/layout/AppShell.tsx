import { useState } from 'react'
import { useProviderStore } from '@/stores/providerStore'
import { useSocket } from '@/lib/socket'
import { HomeScreen }      from '@/components/screens/HomeScreen'
import { MissionsScreen }  from '@/components/screens/MissionsScreen'
import { ProfileScreen }   from '@/components/screens/ProfileScreen'
import { IncomingMissionModal } from '@/components/modals/IncomingMissionModal'

type Tab = 'home' | 'missions' | 'profile'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home',     icon: '🏠', label: 'Accueil'  },
  { id: 'missions', icon: '📋', label: 'Missions' },
  { id: 'profile',  icon: '👤', label: 'Profil'   },
]

export function AppShell() {
  const { accessToken, incomingRequest, currentMission, missionsToday } = useProviderStore()
  const [tab, setTab] = useState<Tab>('home')

  useSocket(accessToken)

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-slate-900">
      {/* Incoming mission overlay */}
      <IncomingMissionModal />

      {/* Screen */}
      <div className="flex-1 overflow-hidden">
        {tab === 'home'     && <HomeScreen />}
        {tab === 'missions' && <MissionsScreen />}
        {tab === 'profile'  && <ProfileScreen />}
      </div>

      {/* Bottom nav */}
      <nav className="flex-shrink-0 flex border-t border-slate-700/60 bg-slate-800/90 backdrop-blur-sm
                      safe-area-inset-bottom">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`nav-item flex-1 ${tab === t.id ? 'active' : ''}`}
          >
            <div className="relative">
              <span className="text-xl leading-none">{t.icon}</span>
              {/* Badge for missions tab */}
              {t.id === 'missions' && currentMission && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 rounded-full
                                 text-[10px] text-white font-bold flex items-center justify-center">
                  1
                </span>
              )}
              {t.id === 'missions' && !currentMission && missionsToday > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-slate-600 rounded-full
                                 text-[10px] text-white font-bold flex items-center justify-center">
                  {missionsToday}
                </span>
              )}
              {/* Alert dot for incoming */}
              {t.id === 'home' && incomingRequest && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping-slow" />
              )}
            </div>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
