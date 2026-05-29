import { useAgentStore } from '@/stores/agentStore'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  const accessToken = useAgentStore((s) => s.accessToken)
  return accessToken ? <AppShell /> : <LoginPage />
}
