import { useSupervisorStore } from '@/stores/supervisorStore'
import { SupervisorShell }    from '@/components/layout/SupervisorShell'
import { LoginPage }          from '@/pages/LoginPage'

export default function App() {
  const token = useSupervisorStore((s) => s.accessToken)
  return token ? <SupervisorShell /> : <LoginPage />
}
