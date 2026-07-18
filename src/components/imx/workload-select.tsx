'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Workload {
  id: string
  name: string
  gpuType: string
}

interface WorkloadSelectProps {
  workloads: Workload[]
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
}

export function WorkloadSelect({ workloads, selectedIds, onChange }: WorkloadSelectProps) {
  const toggle = (id: string, checked: boolean) => {
    const isSelected = selectedIds.includes(id)
    if (checked && !isSelected) {
      onChange([...selectedIds, id])
      return
    }
    if (!checked && isSelected) {
      if (selectedIds.length <= 1) return
      onChange(selectedIds.filter((x) => x !== id))
    }
  }

  return (
    <div className="flex flex-col">
      {workloads.map((w, i) => {
        const checked = selectedIds.includes(w.id)
        const isLast = i === workloads.length - 1
        return (
          <label
            key={w.id}
            className={cn(
              'flex h-9 items-center gap-3 cursor-pointer',
              !isLast && 'border-b border-border/40',
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => toggle(w.id, Boolean(next))}
            />
            <span className="font-medium text-sm flex-1">{w.name}</span>
            <Badge variant="outline">{w.gpuType}</Badge>
          </label>
        )
      })}
    </div>
  )
}
