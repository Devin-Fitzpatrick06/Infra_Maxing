import { cn } from '@/lib/utils'

export interface PulseDotProps {
  className?: string
  live?: boolean
  tone?: 'live' | 'demo' | 'muted'
}

export function PulseDot({ className, live = true, tone }: PulseDotProps) {
  const resolvedTone = tone ?? (live ? 'live' : 'muted')
  return (
    <span
      data-slot="pulse-dot"
      className={cn(
        'imx-pulse-dot inline-block h-1.5 w-1.5 rounded-full',
        resolvedTone === 'live' && 'bg-primary',
        resolvedTone === 'demo' && 'bg-amber-300',
        resolvedTone === 'muted' && 'bg-muted-foreground',
        className,
      )}
    />
  )
}
