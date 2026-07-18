'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface CurvePoint {
  t: string
  price_usd_per_hour: number
}

interface SpotHistoryChartProps {
  points: CurvePoint[]
  height?: number
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatDayLabel = (raw: string) => {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function SpotHistoryChart({
  points,
  height = 200,
}: SpotHistoryChartProps) {
  const data = points.map((p) => ({ day: p.t, spot: p.price_usd_per_hour }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
      >
        <defs>
          <linearGradient id="spotFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="4 8"
          stroke="var(--border)"
        />
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          tickFormatter={formatDayLabel}
          stroke="var(--border)"
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          stroke="var(--border)"
          domain={['auto', 'auto']}
          width={44}
        />
        <Tooltip
          labelStyle={{ color: 'var(--muted-foreground)' }}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--foreground)',
          }}
          labelFormatter={(l: unknown) => formatDayLabel(String(l ?? ''))}
          formatter={((v: unknown) => [
            `$${Number(v).toFixed(3)}`,
            'Spot',
          ]) as never}
        />
        <Area
          type="monotone"
          dataKey="spot"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#spotFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
