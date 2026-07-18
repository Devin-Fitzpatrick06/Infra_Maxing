'use client'

import { cn } from '@/lib/utils'
import { formatPct, formatSignedUsd } from '@/lib/imx/format'

export interface GpuCompareRow {
  gpuType: string
  displayName: string
  savingUsd: number
  savingPct: number
  loading?: boolean
  error?: boolean
}

interface GpuCompareProps {
  rows: GpuCompareRow[]
  selected: string
  onSelect: (gpuType: string) => void
}

export function GpuCompare({ rows, selected, onSelect }: GpuCompareProps) {
  const best = rows
    .filter((r) => !r.error && !r.loading)
    .reduce<GpuCompareRow | null>(
      (acc, r) => (acc == null || r.savingUsd > acc.savingUsd ? r : acc),
      null,
    )

  return (
    <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
      {rows.map((r) => {
        const isSelected = r.gpuType === selected
        const isBest = best?.gpuType === r.gpuType && rows.length > 1
        return (
          <button
            key={r.gpuType}
            type="button"
            onClick={() => onSelect(r.gpuType)}
            className={cn(
              'flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors',
              isSelected
                ? 'border-primary/50 bg-primary/5'
                : 'border-border/60 bg-card/40 hover:border-primary/30',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="imx-heading text-sm">{r.gpuType}</span>
              {isBest ? (
                <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  Best
                </span>
              ) : null}
            </div>
            <div className="text-right">
              {r.loading ? (
                <span className="text-xs text-muted-foreground">…</span>
              ) : r.error ? (
                <span className="text-xs text-destructive">n/a</span>
              ) : (
                <div className="flex flex-col leading-tight">
                  <span
                    className={cn(
                      'imx-heading text-sm',
                      r.savingUsd > 0 ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {formatSignedUsd(r.savingUsd)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatPct(r.savingPct)} saved
                  </span>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
