'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface ScenarioToggleProps {
  value: 'market' | 'stress'
  onChange: (v: 'market' | 'stress') => void
}

export function ScenarioToggle({ value, onChange }: ScenarioToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <ToggleGroup
        className="w-full"
        size="sm"
        variant="outline"
        value={[value]}
        onValueChange={(next) => {
          const picked = next[0]
          if (picked === 'market' || picked === 'stress') {
            onChange(picked)
          }
        }}
      >
        <ToggleGroupItem value="market" className="flex-1">
          Market
        </ToggleGroupItem>
        <ToggleGroupItem value="stress" className="flex-1">
          Stress
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">Stress = bear curve.</p>
    </div>
  )
}
