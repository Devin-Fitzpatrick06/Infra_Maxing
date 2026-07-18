'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export type StrategyKey = 'payAsYouGo' | 'smartBlend' | 'reserveNow'

export interface StrategyChipProps {
  value: StrategyKey
  onChange: (v: StrategyKey) => void
  labels?: Partial<Record<StrategyKey, string>>
}

const DEFAULT_LABELS: Record<StrategyKey, string> = {
  payAsYouGo: 'Pay as you go',
  smartBlend: 'Smart blend',
  reserveNow: 'Reserve now',
}

const ORDER: StrategyKey[] = ['payAsYouGo', 'smartBlend', 'reserveNow']

const RECOMMENDED: StrategyKey = 'smartBlend'

export function StrategyChip({ value, onChange, labels }: StrategyChipProps) {
  const resolved = { ...DEFAULT_LABELS, ...labels }

  return (
    <ToggleGroup
      orientation="vertical"
      value={[value]}
      onValueChange={(next) => {
        const picked = next[next.length - 1] as StrategyKey | undefined
        if (picked && picked !== value) onChange(picked)
      }}
      className="w-full"
    >
      {ORDER.map((key) => {
        const isRecommended = key === RECOMMENDED
        const isSelected = key === value
        return (
          <ToggleGroupItem
            key={key}
            value={key}
            size="lg"
            variant="outline"
            aria-label={resolved[key]}
            className={cn(
              'w-full justify-between px-4 py-3 h-auto text-left',
              isRecommended && 'border-primary/40 bg-primary/5',
              isSelected && 'ring-1 ring-primary/60',
            )}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium">{resolved[key]}</span>
              {isRecommended && isSelected ? (
                <span className="text-[10px] uppercase tracking-wider text-primary/80">
                  star recommended
                </span>
              ) : null}
            </div>
            {isRecommended ? (
              <span className="ml-3 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                recommended
              </span>
            ) : null}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
