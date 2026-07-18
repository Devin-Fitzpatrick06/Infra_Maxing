// Deterministic Ornn-shaped fixture. Used when ORNN_BASE_URL is unset or the
// HTTP client fails. Mean-reverting drift with mild seasonality, consistent
// with the concept doc's illustrative "$2.50 now, $2.80 in 3mo, $3.20 by
// year-end" trajectory.

import { hashSeed, mulberry32, normal } from '@/lib/rand'
import type {
  Chip,
  CurvePoint,
  CurveSnapshot,
  OrnnClient,
  SpotHistorySnapshot,
} from './types'

const MS_PER_DAY = 86_400_000

// GPU universe mirrors ORNN's Compute Price Index chips.
const CHIPS: Chip[] = [
  { gpuType: 'A100', displayName: 'NVIDIA A100' },
  { gpuType: 'B200', displayName: 'NVIDIA B200' },
  { gpuType: 'H100', displayName: 'NVIDIA H100' },
  { gpuType: 'H200', displayName: 'NVIDIA H200' },
  { gpuType: 'RTX 5090', displayName: 'NVIDIA RTX 5090' },
  { gpuType: 'RTX PRO 6000', displayName: 'NVIDIA RTX PRO 6000' },
]

// Anchor $/hr — A100 pinned to ORNN's published index ($0.99). Other tiers
// spaced relative to it using the current market ordering visible in the ORNN
// index page. All numbers drift over time via the mean-reverting path below.
const ANCHOR: Record<string, number> = {
  A100: 0.99,
  B200: 5.5,
  H100: 2.4,
  H200: 3.1,
  'RTX 5090': 0.85,
  'RTX PRO 6000': 1.6,
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
      // Downward-sloping (backwardation) — forward tenors trade below spot
      // because Ornn quotes a supply-guaranteed strip. This is what makes a
      // reservation valuable: the far end of the curve prices ~27% under spot,
      // which is where the "hedge saves 20-40%" thesis lives.
      const target = anchor * (1 - 0.27 * (d / horizonDays))
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

  async getSpotHistory(
    gpuType: string,
    days: number,
  ): Promise<SpotHistorySnapshot> {
    const anchor = ANCHOR[gpuType] ?? 1.5
    // Distinct seed from the forward curve so history doesn't mirror future.
    const seed = hashSeed(`ornn:spot-history:${gpuType}`)
    const rng = mulberry32(seed)
    const now = Date.now()
    const todayMs = Math.floor(now / MS_PER_DAY) * MS_PER_DAY

    // Walk forward from `days` ago up to today. The path drifts UP toward
    // today's anchor with mild reversion + noise — this mimics tight
    // supply pushing spot up over the trailing period, which is the story
    // the forward curve is priced against.
    const points: CurvePoint[] = []
    const startLevel = anchor * 0.85
    let level = startLevel
    for (let d = 0; d < days; d++) {
      const dayIdx = days - 1 - d // remaining days until today
      const target = anchor * (1 - 0.12 * (dayIdx / days))
      const meanRevert = 0.03 * (target - level)
      const noise = 0.008 * anchor * normal(rng)
      level += meanRevert + noise
      const ms = todayMs - dayIdx * MS_PER_DAY
      const t = new Date(ms).toISOString().slice(0, 10)
      points.push({ t, price_usd_per_hour: Number(level.toFixed(4)) })
    }

    const fromDate = points[0]?.t ?? new Date(todayMs).toISOString().slice(0, 10)
    const toDate =
      points[points.length - 1]?.t ??
      new Date(todayMs).toISOString().slice(0, 10)

    return {
      gpuType,
      fetchedAt: new Date(now).toISOString(),
      fromDate,
      toDate,
      points,
      source: 'ornn_fixture',
    }
  }
}
