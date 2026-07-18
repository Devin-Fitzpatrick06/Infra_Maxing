'use client'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
  hint?: string
  disabled?: boolean
}

const defaultFormat = (v: number) => v.toString()

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format = defaultFormat,
  onChange,
  hint,
  disabled,
}: SliderRowProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', disabled && 'opacity-50')}>
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-sm text-foreground">{label}</Label>
        <span className="text-primary font-mono text-sm tabular-nums">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => {
          const v = Array.isArray(next) ? next[0] : next
          if (typeof v === 'number') onChange(v)
        }}
      />
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
