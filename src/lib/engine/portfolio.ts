// Portfolio layer. Composes per-workload `recommend()` calls into a single
// company-level view: totals, three canonical strategies (pay-as-you-go /
// smart-blend / reserve-now), a headline recommendation, and a deterministic
// time-saved heuristic. Pure aggregation — no I/O beyond the two clients passed
// in via `deps`.

import type { DatadogClient } from '@/lib/datadog/types'
import { toDailyRows } from '@/lib/datadog/fixtures'
import type { OrnnClient } from '@/lib/ornn/types'
import { recommend } from './model'
import type { CurvePoint, CurveScenario, UsageDay } from './types'

// Anchors for the time-saved chip. Tunable during rehearsal.
export const PORTFOLIO_TIME_HEURISTIC = {
  hoursPerReview: 6,
  reviewsPerYear: 4,
} as const

export type PortfolioScenario = 'market' | 'stress'

export interface PortfolioInputs {
  workloadIds: string[]
  horizonMonths: 3 | 6 | 12 | 36
  scenario: PortfolioScenario
  growthPctYr: number // -50..+100
  baselineSharePct: number // 0..100
  forwardVsTodayPct: number // -60..0 (negative = forward cheaper than spot today)
}

export interface PortfolioLine {
  workloadId: string
  workloadName: string
  gpuType: string
  reservedPct: number
  baselineCostUsd: number
  strategyCostUsd: number
  savingUsd: number
}

export interface StrategyTotals {
  costUsd: number
}

export interface PortfolioOutput {
  lines: PortfolioLine[]
  monthlyRunRateUsd: number
  totals: {
    onDemandCostUsd: number
    strategyCostUsd: number
    savingUsd: number
    savingPct: number
  }
  strategies: {
    payAsYouGo: StrategyTotals
    smartBlend: StrategyTotals
    reserveNow: StrategyTotals
  }
  recommendation: {
    headline: string
    rationale: string
  }
  timeSavedHours: number
  inputs: PortfolioInputs
  provenance: {
    curveSources: Record<string, 'ornn_http' | 'ornn_fixture'>
    curveFetchedAt: string
    workloadCount: number
  }
}

// Map the portfolio-level 2-chip scenario to the workload engine's 4-value enum.
function toEngineScenario(scenario: PortfolioScenario): CurveScenario {
  return scenario === 'stress' ? 'bear' : 'market'
}

// Portfolio inputs → engine inputs for a single workload. `reservedPct` is
// derived per workload from `baselineSharePct` but we pass it through to the
// engine which will further clamp between p25 floor and mean demand.
function toEngineInputs(inputs: PortfolioInputs, gpuType: string) {
  const usageBias = clamp(
    (inputs.growthPctYr / 100) * (inputs.horizonMonths / 12),
    -0.25,
    0.25,
  )
  const reservedPct = clamp(inputs.baselineSharePct / 100, 0, 1)
  return {
    gpuType,
    reservedPct,
    horizonMonths: inputs.horizonMonths,
    usageBias,
    scenario: toEngineScenario(inputs.scenario),
  }
}

// Override the engine's discount schedule with a single value derived from
// the forward-vs-today slider. Negative percentages = forward cheaper.
function toDiscountOverride(forwardVsTodayPct: number, horizonMonths: number) {
  const pct = clamp(forwardVsTodayPct, -60, 0)
  const discount = -pct / 100 // -27 => 0.27 discount
  return { [horizonMonths]: discount } as Record<number, number>
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// Deterministic "time saved" heuristic. Scales with # workloads selected and
// horizon in years. See PORTFOLIO_TIME_HEURISTIC.
function computeTimeSavedHours(workloadCount: number, horizonMonths: number): number {
  const years = horizonMonths / 12
  return Math.round(
    PORTFOLIO_TIME_HEURISTIC.hoursPerReview *
      workloadCount *
      years *
      PORTFOLIO_TIME_HEURISTIC.reviewsPerYear,
  )
}

function buildHeadline(inputs: PortfolioInputs): {
  headline: string
  rationale: string
} {
  const s = Math.floor(clamp(inputs.baselineSharePct, 0, 100))
  const fwd = Math.abs(Math.floor(inputs.forwardVsTodayPct))
  if (s === 0) {
    return {
      headline: 'Serve everything on-demand.',
      rationale:
        "The forward market isn't cheap enough to justify locking capacity — stay flexible.",
    }
  }
  if (s === 100) {
    return {
      headline: `Reserve the full ${inputs.horizonMonths}-month strip forward.`,
      rationale: `Lock every GPU-hour at today's forward price. Maximum hedge, minimum flexibility.`,
    }
  }
  return {
    headline: `Reserve ${s}% baseline forward.`,
    rationale: `Lock steady demand on a ${inputs.horizonMonths}-mo forward — serve the top ${100 - s}% burst on-demand. Forward is ${fwd}% below spot today.`,
  }
}

interface ComputeOptions {
  workloadReservedPctOverride?: number // for pay-as-you-go / reserve-now strategy runs
}

async function computeOnce(
  inputs: PortfolioInputs,
  workloads: Array<{ id: string; name: string; gpuType: string }>,
  usageByWorkload: Map<string, UsageDay[]>,
  curveByGpuType: Map<string, CurvePoint[]>,
  opts: ComputeOptions = {},
): Promise<{
  lines: PortfolioLine[]
  onDemandCostUsd: number
  strategyCostUsd: number
}> {
  const lines: PortfolioLine[] = []
  let onDemandCostUsd = 0
  let strategyCostUsd = 0

  for (const w of workloads) {
    const usage = usageByWorkload.get(w.id) ?? []
    const curve = curveByGpuType.get(w.gpuType) ?? []
    if (usage.length === 0 || curve.length === 0) continue

    const engineInputs = toEngineInputs(inputs, w.gpuType)
    if (opts.workloadReservedPctOverride !== undefined) {
      engineInputs.reservedPct = opts.workloadReservedPctOverride
    }
    const out = recommend({
      gpuType: w.gpuType,
      curve,
      usage,
      inputs: engineInputs,
      discounts: toDiscountOverride(inputs.forwardVsTodayPct, inputs.horizonMonths),
    })
    lines.push({
      workloadId: w.id,
      workloadName: w.name,
      gpuType: w.gpuType,
      reservedPct: engineInputs.reservedPct,
      baselineCostUsd: out.recommendation.baselineCostUsd,
      strategyCostUsd: out.recommendation.strategyCostUsd,
      savingUsd: out.savingEstimateUsd,
    })
    onDemandCostUsd += out.recommendation.baselineCostUsd
    strategyCostUsd += out.recommendation.strategyCostUsd
  }
  return { lines, onDemandCostUsd, strategyCostUsd }
}

export async function recommendPortfolio(
  inputs: PortfolioInputs,
  deps: { ornn: OrnnClient; datadog: DatadogClient },
): Promise<PortfolioOutput> {
  const allWorkloads = await deps.datadog.listWorkloads()
  const selected = allWorkloads.filter((w) => inputs.workloadIds.includes(w.id))
  if (selected.length === 0) {
    return emptyPortfolio(inputs)
  }

  // Fetch daily usage (~120 days trailing history) for each workload in parallel.
  const today = new Date()
  const toISO = today.toISOString().slice(0, 10)
  const from = new Date(today.getTime() - 120 * 86_400_000)
  const fromISO = from.toISOString().slice(0, 10)

  const usageByWorkload = new Map<string, UsageDay[]>()
  await Promise.all(
    selected.map(async (w) => {
      const series = await deps.datadog.getUsageSeries(w.id, fromISO, toISO)
      const rows = toDailyRows(series).map((r) => ({
        day: r.day,
        gpuHours: r.gpuHours,
        onDemandHours: r.onDemandHours,
        reservedHours: r.reservedHours,
        costUsd: r.costUsd,
      }))
      usageByWorkload.set(w.id, rows)
    }),
  )

  // Fetch curves per unique GPU type in parallel.
  const gpuTypes = Array.from(new Set(selected.map((w) => w.gpuType)))
  const horizonDays = Math.max(30, inputs.horizonMonths * 30 + 30)
  const curveByGpuType = new Map<string, CurvePoint[]>()
  const curveSources: Record<string, 'ornn_http' | 'ornn_fixture'> = {}
  let latestFetchedAt = new Date().toISOString()
  await Promise.all(
    gpuTypes.map(async (gpu) => {
      const snap = await deps.ornn.getForwardCurve(gpu, horizonDays)
      curveByGpuType.set(gpu, snap.points)
      curveSources[gpu] = snap.source
      latestFetchedAt = snap.fetchedAt
    }),
  )

  // 3 canonical strategy runs + the primary (optimizer's smart-blend) run.
  const smartBlend = await computeOnce(
    inputs,
    selected,
    usageByWorkload,
    curveByGpuType,
  )
  const payAsYouGo = await computeOnce(
    inputs,
    selected,
    usageByWorkload,
    curveByGpuType,
    { workloadReservedPctOverride: 0 },
  )
  const reserveNow = await computeOnce(
    inputs,
    selected,
    usageByWorkload,
    curveByGpuType,
    { workloadReservedPctOverride: 1 },
  )

  const savingUsd = smartBlend.onDemandCostUsd - smartBlend.strategyCostUsd
  const savingPct =
    smartBlend.onDemandCostUsd > 0
      ? savingUsd / smartBlend.onDemandCostUsd
      : 0

  // Monthly run rate: sum of workloads' most recent daily cost × 30. Uses the
  // real fixture cost so it matches what a "monthly GPU spend" readout should
  // show — the answer to "how much are we spending right now?"
  let monthlyRunRateUsd = 0
  for (const [, rows] of usageByWorkload) {
    if (rows.length === 0) continue
    const tail = rows.slice(-30)
    const dailyAvg =
      tail.reduce((acc, r) => acc + r.costUsd, 0) / Math.max(1, tail.length)
    monthlyRunRateUsd += dailyAvg * 30
  }

  const { headline, rationale } = buildHeadline(inputs)

  return {
    lines: smartBlend.lines,
    monthlyRunRateUsd: Number(monthlyRunRateUsd.toFixed(2)),
    totals: {
      onDemandCostUsd: Number(smartBlend.onDemandCostUsd.toFixed(2)),
      strategyCostUsd: Number(smartBlend.strategyCostUsd.toFixed(2)),
      savingUsd: Number(savingUsd.toFixed(2)),
      savingPct: Number(savingPct.toFixed(4)),
    },
    strategies: {
      payAsYouGo: { costUsd: Number(payAsYouGo.strategyCostUsd.toFixed(2)) },
      smartBlend: { costUsd: Number(smartBlend.strategyCostUsd.toFixed(2)) },
      reserveNow: { costUsd: Number(reserveNow.strategyCostUsd.toFixed(2)) },
    },
    recommendation: { headline, rationale },
    timeSavedHours: computeTimeSavedHours(selected.length, inputs.horizonMonths),
    inputs,
    provenance: {
      curveSources,
      curveFetchedAt: latestFetchedAt,
      workloadCount: selected.length,
    },
  }
}

function emptyPortfolio(inputs: PortfolioInputs): PortfolioOutput {
  return {
    lines: [],
    monthlyRunRateUsd: 0,
    totals: {
      onDemandCostUsd: 0,
      strategyCostUsd: 0,
      savingUsd: 0,
      savingPct: 0,
    },
    strategies: {
      payAsYouGo: { costUsd: 0 },
      smartBlend: { costUsd: 0 },
      reserveNow: { costUsd: 0 },
    },
    recommendation: {
      headline: 'Pick at least one workload.',
      rationale: 'No workloads selected — nothing to recommend.',
    },
    timeSavedHours: 0,
    inputs,
    provenance: {
      curveSources: {},
      curveFetchedAt: new Date(0).toISOString(),
      workloadCount: 0,
    },
  }
}
