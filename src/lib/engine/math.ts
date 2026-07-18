import type { CurvePoint, UsageDay } from './types'

const MS_PER_DAY = 86_400_000

export function toMs(iso: string): number {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  )
}

export function toDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

// Average GPU-hours per day across the last N days of usage.
export function meanDailyHours(usage: UsageDay[], lastNDays = 30): number {
  if (usage.length === 0) return 0
  const tail = usage.slice(-lastNDays)
  const sum = tail.reduce((acc, r) => acc + r.gpuHours, 0)
  return sum / tail.length
}

// A stable "steady floor" — the p25 of daily GPU-hours over the window.
// This is what teams typically pin under reservations.
export function steadyFloorHours(usage: UsageDay[]): number {
  if (usage.length === 0) return 0
  const sorted = usage.map((r) => r.gpuHours).sort((a, b) => a - b)
  const idx = Math.max(0, Math.floor(sorted.length * 0.25) - 1)
  return sorted[idx] ?? 0
}

// Sample a forward curve at a given month offset from its first point.
// The curve is expected to be ordered ascending by date. We piecewise-linear
// interpolate between adjacent points; monthOffset=0 = curve[0].
export function priceAtMonth(curve: CurvePoint[], monthOffset: number): number {
  if (curve.length === 0) return 0
  if (curve.length === 1) return curve[0].price_usd_per_hour
  const t0 = toMs(curve[0].t)
  const targetMs = t0 + monthOffset * 30 * MS_PER_DAY

  if (targetMs <= t0) return curve[0].price_usd_per_hour
  const last = curve[curve.length - 1]
  const lastMs = toMs(last.t)
  if (targetMs >= lastMs) return last.price_usd_per_hour

  // Binary search would be nicer; linear scan is fine for O(180)-point curves.
  for (let i = 1; i < curve.length; i++) {
    const bMs = toMs(curve[i].t)
    if (bMs >= targetMs) {
      const aMs = toMs(curve[i - 1].t)
      const aPx = curve[i - 1].price_usd_per_hour
      const bPx = curve[i].price_usd_per_hour
      const frac = (targetMs - aMs) / (bMs - aMs || 1)
      return aPx + frac * (bPx - aPx)
    }
  }
  return last.price_usd_per_hour
}

// Standard deviation of curve prices, useful for a naive confidence band.
export function curveStdev(curve: CurvePoint[]): number {
  if (curve.length < 2) return 0
  const prices = curve.map((p) => p.price_usd_per_hour)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const variance =
    prices.reduce((acc, p) => acc + (p - mean) ** 2, 0) / prices.length
  return Math.sqrt(variance)
}
