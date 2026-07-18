// Deterministic Ornn-shaped fixture. Used when ORNN_BASE_URL is unset or the
// HTTP client fails. Mean-reverting drift with mild seasonality, consistent
// with the concept doc's illustrative "$2.50 now, $2.80 in 3mo, $3.20 by
// year-end" trajectory.

import { hashSeed, mulberry32, normal } from '@/lib/rand'
import type { Chip, CurvePoint, CurveSnapshot, OrnnClient } from './types'

const MS_PER_DAY = 86_400_000

const CHIPS: Chip[] = [
  { gpuType: 'H100', displayName: 'NVIDIA H100' },
  { gpuType: 'A10G', displayName: 'NVIDIA A10G' },
]

const ANCHOR: Record<string, number> = {
  H100: 2.55,
  A10G: 0.9,
}

export class FixtureOrnnClient implements OrnnClient {
  async listChips(): Promise<Chip[]> {
    return CHIPS.map((c) => ({ ...c }))
  }

  async getForwardCurve(
    gpuType: string,
    horizonDays: number,
  ): Promise<CurveSnapshot> {
    const anchor = ANCHOR[gpuType] ?? 1.5
    const seed = hashSeed(`ornn:${gpuType}`)
    const rng = mulberry32(seed)
    const now = Date.now()
    // Snap to today's UTC midnight so the curve is deterministic across
    // dev/prod for the same day.
    const todayMs = Math.floor(now / MS_PER_DAY) * MS_PER_DAY
    const points: CurvePoint[] = []

    let level = anchor
    for (let d = 0; d < horizonDays; d++) {
      // Mean-reverting drift toward `anchor * 1.15` over the horizon,
      // with small daily noise. Mimics an upward-sloping forward curve.
      const target = anchor * (1 + 0.15 * (d / horizonDays))
      const meanRevert = 0.02 * (target - level)
      const noise = 0.005 * anchor * normal(rng)
      level += meanRevert + noise
      const t = new Date(todayMs + d * MS_PER_DAY).toISOString().slice(0, 10)
      points.push({ t, price_usd_per_hour: Number(level.toFixed(4)) })
    }

    return {
      gpuType,
      fetchedAt: new Date(now).toISOString(),
      horizonDays,
      points,
      source: 'ornn_fixture',
    }
  }
}
