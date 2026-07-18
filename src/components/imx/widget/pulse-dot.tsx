import { cn } from '@/lib/utils'

export interface PulseDotProps {
  className?: string
  live?: boolean
}

export function PulseDot({ className, live = true }: PulseDotProps) {
  return (
    <span
      data-slot="pulse-dot"
      className={cn(
        'imx-pulse-dot inline-block h-1.5 w-1.5 rounded-full',
        live ? 'bg-primary' : 'bg-muted-foreground',
        className,
      )}
    />
  )
}
