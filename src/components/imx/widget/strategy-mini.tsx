import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatUsd } from '@/lib/imx/format'

export type StrategyKey = 'payAsYouGo' | 'smartBlend' | 'reserveNow'

export interface StrategyMiniProps {
  costs: Record<StrategyKey, number>
  savings: Record<StrategyKey, number>
  onDemand: number
  className?: string
}

const ORDER: StrategyKey[] = ['payAsYouGo', 'smartBlend', 'reserveNow']

const SHORT_LABEL: Record<StrategyKey, string> = {
  payAsYouGo: 'Pay-go',
  smartBlend: 'Blend',
  reserveNow: 'Reserve',
}

function formatSignedPct(fraction: number): string {
  if (!Number.isFinite(fraction) || fraction === 0) return '0%'
  const pct = fraction * 100
  const sign = pct > 0 ? '+' : '−'
  return `${sign}${Math.abs(pct).toFixed(1)}%`
}

export function StrategyMini({ costs, savings, onDemand, className }: StrategyMiniProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {ORDER.map((key) => {
        const cost = costs[key]
        const saved = savings[key]
        const pct = onDemand > 0 ? saved / onDemand : 0
        const isBlend = key === 'smartBlend'
        const positive = pct > 0
        return (
          <div
            key={key}
            className={cn(
              'rounded-lg border border-border bg-background/40 p-3',
              isBlend && 'ring-1 ring-primary/50',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="imx-mono-label">{SHORT_LABEL[key]}</span>
              {isBlend ? <Check className="h-3 w-3 text-primary" /> : null}
            </div>
            <div className="imx-heading mt-1 text-lg leading-none">{formatUsd(cost)}</div>
            <div
              className={cn(
                'mt-1 text-xs',
                positive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {formatSignedPct(pct)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
