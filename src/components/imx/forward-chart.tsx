'use client'

import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface CurvePoint {
  t: string
  price_usd_per_hour: number
}

interface ForwardChartProps {
  curve: CurvePoint[]
  highlightStrategy?: 'payAsYouGo' | 'smartBlend' | 'reserveNow'
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
  if (!Number.isNaN(d.getTime())) {
    return MONTHS[d.getUTCMonth()]
  }
  return raw
}

const fillOpacityFor = (
  strategy?: 'payAsYouGo' | 'smartBlend' | 'reserveNow',
) => {
  if (strategy === 'payAsYouGo') return 0.05
  if (strategy === 'reserveNow') return 0.28
  return 0.16
}

export function ForwardChart({ curve, highlightStrategy }: ForwardChartProps) {
  const spotPrice = curve.length > 0 ? curve[0].price_usd_per_hour : 0

  const data = curve.map((point) => {
    const forward = point.price_usd_per_hour
    return {
      day: point.t,
      forward,
      spot: spotPrice,
      hedgeBase: Math.min(forward, spotPrice),
      hedgeDelta: Math.abs(forward - spotPrice),
    }
  })

  const mintOpacity = fillOpacityFor(highlightStrategy)

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart
        data={data}
        margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="4 8"
          stroke="var(--border)"
        />
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickFormatter={formatDayLabel}
          stroke="var(--border)"
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          domain={['auto', 'auto']}
          stroke="var(--border)"
        />
        <Tooltip
          labelStyle={{ color: 'var(--muted-foreground)' }}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--foreground)',
          }}
          labelFormatter={(label: unknown) => formatDayLabel(String(label ?? ''))}
          formatter={((value: unknown, name: unknown) => {
            const key = String(name ?? '')
            const label =
              key === 'forward'
                ? 'Forward'
                : key === 'spot'
                  ? 'Spot (today)'
                  : key === 'hedgeDelta'
                    ? 'Hedge gap'
                    : key
            return [`$${Number(value).toFixed(3)}`, label]
          }) as never}
        />
        <Area
          type="monotone"
          dataKey="hedgeBase"
          stackId="hedge"
          stroke="none"
          fill="transparent"
          isAnimationActive={false}
          activeDot={false}
          legendType="none"
        />
        <Area
          type="monotone"
          dataKey="hedgeDelta"
          stackId="hedge"
          stroke="none"
          fill="var(--chart-1)"
          fillOpacity={mintOpacity}
          isAnimationActive={false}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="spot"
          stroke="var(--chart-2)"
          fill="transparent"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="forward"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={mintOpacity}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
