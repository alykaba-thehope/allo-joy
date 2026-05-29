import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initDb } from '../src/lib/db'
import { useCitizenStore } from '../src/stores/citizenStore'
import { fullSync } from '../src/lib/sync'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function RootLayout() {
  const loadFromDb = useCitizenStore(s => s.loadFromDb)

  useEffect(() => {
    async function boot() {
      await initDb()
      loadFromDb()
      fullSync().catch(() => {})
    }
    boot()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="ticket/new"
              options={{ headerShown: true, title: 'Nouveau ticket', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ticket/[id]"
              options={{ headerShown: true, title: 'Détail du ticket' }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
