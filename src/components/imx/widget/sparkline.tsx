'use client'

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

export interface SparklineProps {
  data: number[]
  height?: number
  color?: string
  fillOpacity?: number
  className?: string
}

export function Sparkline({
  data,
  height = 40,
  color = 'var(--primary)',
  fillOpacity = 0.2,
  className,
}: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis dataKey="v" domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={fillOpacity}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
