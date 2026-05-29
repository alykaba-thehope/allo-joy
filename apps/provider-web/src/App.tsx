import { useProviderStore } from '@/stores/providerStore'
import { AppShell }  from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  const token = useProviderStore((s) => s.accessToken)
  return token ? <AppShell /> : <LoginPage />
}
