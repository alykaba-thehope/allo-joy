import { cn } from './cn'

const VARIANTS = {
  default:  'bg-slate-700 text-slate-300',
  blue:     'bg-joy-900/60 text-joy-300 border border-joy-700/50',
  green:    'bg-green-900/60 text-green-300 border border-green-700/50',
  amber:    'bg-amber-900/60 text-amber-300 border border-amber-700/50',
  red:      'bg-red-900/60 text-red-300 border border-red-700/50',
  yellow:   'bg-yellow-900/60 text-yellow-300 border border-yellow-600/50',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof VARIANTS
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', VARIANTS[variant], className)}>
      {children}
    </span>
  )
}
