import { cn } from '@/lib/utils'
import { PulseDot } from './pulse-dot'

export interface LiveBadgeProps {
  source?: string
  className?: string
}

export function LiveBadge({ source, className }: LiveBadgeProps) {
  const label = source ? source.toUpperCase() : 'ORNN LIVE'
  return (
    <span
      data-slot="live-badge"
      className={cn(
        'imx-heading inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs tracking-wide text-primary',
        className,
      )}
    >
      <PulseDot tone="live" />
      {label}
    </span>
  )
}
