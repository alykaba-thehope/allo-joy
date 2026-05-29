import { Redirect } from 'expo-router'
import { useCitizenStore } from '../src/stores/citizenStore'

export default function Index() {
  const isAuthenticated = useCitizenStore(s => s.isAuthenticated)
  return <Redirect href={isAuthenticated ? '/(tabs)/' : '/(auth)/phone'} />
}
