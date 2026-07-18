import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WidgetCard } from './widget-card'
import { Sparkline } from './sparkline'

export interface StatWidgetProps {
  label: string
  value: string
  delta?: string
  deltaTone?: 'up' | 'down' | 'flat'
  hint?: string
  sparkline?: number[]
  sparkColor?: string
  glow?: boolean
  className?: string
  action?: React.ReactNode
}

const TONE_COLORS: Record<NonNullable<StatWidgetProps['deltaTone']>, string> = {
  up: 'text-primary',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
}

const TONE_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const

export function StatWidget({
  label,
  value,
  delta,
  deltaTone = 'flat',
  hint,
  sparkline,
  sparkColor,
  glow,
  className,
  action,
}: StatWidgetProps) {
  const Icon = TONE_ICON[deltaTone]
  return (
    <WidgetCard label={label} action={action} glow={glow} className={className}>
      <div className="flex flex-col gap-2">
        <div className="imx-heading text-3xl leading-none md:text-4xl">{value}</div>
        {delta ? (
          <div className={cn('inline-flex items-center gap-1 text-sm', TONE_COLORS[deltaTone])}>
            <Icon className="h-3.5 w-3.5" />
            <span>{delta}</span>
          </div>
        ) : null}
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        {sparkline && sparkline.length > 0 ? (
          <Sparkline
            data={sparkline}
            color={sparkColor || 'var(--primary)'}
            className="mt-2"
          />
        ) : null}
      </div>
    </WidgetCard>
  )
}
