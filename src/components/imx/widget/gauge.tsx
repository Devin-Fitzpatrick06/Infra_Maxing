import { cn } from '@/lib/utils'

export interface GaugeProps {
  value: number
  label?: string
  size?: number
  color?: string
  className?: string
}

export function Gauge({
  value,
  label,
  size = 160,
  color = 'var(--primary)',
  className,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(1, value))
  const stroke = 12
  const r = (size / 2) * 0.8
  const cx = size / 2
  const cy = size * 0.55
  const arcLen = Math.PI * r
  const dashOffset = arcLen * (1 - clamped)
  const viewH = Math.round(size * 0.7)
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const percent = `${Math.round(clamped * 1000) / 10}%`

  return (
    <div className={cn('relative', className)} style={{ width: size, height: viewH }}>
      <svg
        width={size}
        height={viewH}
        viewBox={`0 0 ${size} ${viewH}`}
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
        style={{ top: cy - 28 }}
      >
        <div className="imx-heading text-3xl leading-none">{percent}</div>
        {label ? (
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        ) : null}
      </div>
    </div>
  )
}
