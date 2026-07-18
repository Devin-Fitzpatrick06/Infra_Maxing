'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface Chip {
  gpuType: string
  displayName: string
}

interface GpuPickerProps {
  chips: Chip[]
  value: string
  onChange: (gpuType: string) => void
}

export function GpuPicker({ chips, value, onChange }: GpuPickerProps) {
  if (chips.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">Loading GPUs…</div>
    )
  }
  return (
    <ToggleGroup
      className="w-full flex-wrap"
      size="sm"
      variant="outline"
      orientation="horizontal"
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0]
        if (picked) onChange(picked)
      }}
    >
      {chips.map((c) => (
        <ToggleGroupItem
          key={c.gpuType}
          value={c.gpuType}
          aria-label={c.displayName}
          className="min-w-[64px] flex-1 basis-[64px]"
        >
          {c.gpuType}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
