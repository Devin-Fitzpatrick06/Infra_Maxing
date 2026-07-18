'use client'

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { formatUsd } from '@/lib/imx/format'

interface ComparisonBarsProps {
  onDemand: number
  reserveAll: number
  smartBlend: number
  starRecommended?: boolean
}

export function ComparisonBars({ onDemand, reserveAll, smartBlend, starRecommended }: ComparisonBarsProps) {
  const data = [
    { label: 'On-demand', value: onDemand, color: 'var(--chart-2)' },
    { label: 'Reserve all', value: reserveAll, color: 'var(--chart-3)' },
    { label: 'Smart blend', value: smartBlend, color: 'var(--chart-1)' },
  ]

  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 60, left: 80, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          width={80}
        />
        <Bar dataKey="value" radius={6}>
          {data.map((row) => (
            <Cell key={row.label} fill={row.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={((v: unknown) => {
              const n = Number(v)
              return starRecommended && n === smartBlend ? `★ ${formatUsd(n)}` : formatUsd(n)
            }) as never}
            style={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
