const MINUTE = 60_000
const HOUR   = 3_600_000
const DAY    = 86_400_000

export function formatDistanceToNow(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < MINUTE)    return 'À l\'instant'
  if (diff < HOUR)      return `Il y a ${Math.floor(diff / MINUTE)}min`
  if (diff < DAY)       return `Il y a ${Math.floor(diff / HOUR)}h`
  if (diff < 7 * DAY)   return `Il y a ${Math.floor(diff / DAY)}j`
  return new Date(timestamp).toLocaleDateString('fr-GN', { day: 'numeric', month: 'short' })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-GN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
