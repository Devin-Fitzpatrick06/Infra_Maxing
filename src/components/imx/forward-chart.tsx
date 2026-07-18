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

type StrategyKey = 'payAsYouGo' | 'smartBlend' | 'reserveNow'

interface ForwardChartProps {
  curve: CurvePoint[]
  highlightStrategy?: StrategyKey
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

const HEDGE_BLUE = 'oklch(0.72 0.16 240)'

const formatDayLabel = (raw: string) => {
  if (!raw) return ''
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    return MONTHS[d.getUTCMonth()]
  }
  return raw
}

const fillOpacityFor = (strategy?: StrategyKey) => {
  if (strategy === 'payAsYouGo') return 0.08
  if (strategy === 'reserveNow') return 0.32
  return 0.22
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

  const hedgeOpacity = fillOpacityFor(highlightStrategy)
  const useStripes = highlightStrategy === 'smartBlend'
  const hedgeFill = useStripes ? 'url(#hedgeStripes)' : HEDGE_BLUE

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart
        data={data}
        margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
      >
        <defs>
          <pattern
            id="hedgeStripes"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill={HEDGE_BLUE} fillOpacity={0.18} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke={HEDGE_BLUE}
              strokeWidth="3"
              strokeOpacity={0.9}
            />
          </pattern>
        </defs>
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
          stroke={HEDGE_BLUE}
          strokeWidth={useStripes ? 1.5 : 1}
          strokeOpacity={useStripes ? 0.8 : 0.4}
          fill={hedgeFill}
          fillOpacity={useStripes ? 1 : hedgeOpacity}
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
          fillOpacity={0.08}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
