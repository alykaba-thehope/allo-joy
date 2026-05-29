import { useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useQueryClient } from '@tanstack/react-query'
import { fullSync } from '../lib/sync'

export function useNetworkSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        fullSync().then(() => {
          queryClient.invalidateQueries({ queryKey: ['tickets-local'] })
        }).catch(() => {})
      }
    })
    return unsubscribe
  }, [queryClient])
}
