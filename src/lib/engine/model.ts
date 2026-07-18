// Pure recommendation engine. Deterministic given the same inputs.
// The math is intentionally simple and legible so it can be audited on stage:
//
//   1. Estimate the workload's steady demand (p25 daily GPU-hours) and its
//      mean demand, both derived from `usage` history.
//   2. Apply `usageBias` uniformly (stress test).
//   3. Apply the scenario perturbation to the forward curve.
//   4. For each month in the horizon, compute:
//        - baseline: all on-demand at the curve price for that month
//        - strategy: `reservedPct` * mean_hours locked at a discounted price
//          (from DEFAULT_DISCOUNT_SCHEDULE), rest on-demand at the curve
//   5. Sum both, take the delta → projected saving.
//   6. Confidence band = ±(curve stdev / mean) * saving, floored at 5%.
//   7. Break-even month = first month where cumulative strategy cost catches
//      up to a hypothetical "wait one month, then reserve" alternative.

import {
  curveStdev,
  meanDailyHours,
  priceAtMonth,
  steadyFloorHours,
} from './math'
import { applyScenario } from './scenarios'
import {
  DEFAULT_DISCOUNT_SCHEDULE,
  type EngineArgs,
  type EngineOutput,
  type RecommendedMixRow,
} from './types'

const DAYS_PER_MONTH = 30

export function recommend(args: EngineArgs): EngineOutput {
  const {
    gpuType,
    curve,
    usage,
    inputs,
    discounts = DEFAULT_DISCOUNT_SCHEDULE,
  } = args

  const scenarioCurve = applyScenario(curve, inputs.scenario)
  const meanHours = meanDailyHours(usage) * (1 + inputs.usageBias)
  const floorHours = steadyFloorHours(usage) * (1 + inputs.usageBias)

  const discount = discounts[inputs.horizonMonths] ?? 0.3
  const reservedMonthlyHours =
    Math.min(meanHours, Math.max(floorHours, meanHours * inputs.reservedPct)) *
    DAYS_PER_MONTH

  // Lock the reservation price at month 0 (that's the whole thesis — timing).
  const lockPrice = priceAtMonth(scenarioCurve, 0) * (1 - discount)

  const mix: RecommendedMixRow[] = []
  let baselineCost = 0
  let strategyCost = 0
  let cumulativeCurveCost = 0
  let cumulativeStrategyCost = 0
  let breakEvenMonthOffset: number | null = null

  for (let m = 0; m < inputs.horizonMonths; m++) {
    const spot = priceAtMonth(scenarioCurve, m)
    const totalMonthlyHours = meanHours * DAYS_PER_MONTH
    const monthlyReserved = Math.min(reservedMonthlyHours, totalMonthlyHours)
    const monthlyOnDemand = totalMonthlyHours - monthlyReserved

    const baselineMonth = totalMonthlyHours * spot
    const strategyMonth = monthlyReserved * lockPrice + monthlyOnDemand * spot

    baselineCost += baselineMonth
    strategyCost += strategyMonth
    cumulativeCurveCost += baselineMonth
    cumulativeStrategyCost += strategyMonth

    if (
      breakEvenMonthOffset === null &&
      cumulativeStrategyCost < cumulativeCurveCost
    ) {
      breakEvenMonthOffset = m
    }

    mix.push({
      monthOffset: m,
      reservedHours: Number(monthlyReserved.toFixed(2)),
      onDemandHours: Number(monthlyOnDemand.toFixed(2)),
      costUsd: Number(strategyMonth.toFixed(2)),
    })
  }

  const savingEstimateUsd = baselineCost - strategyCost
  const stdev = curveStdev(scenarioCurve)
  const meanPrice =
    scenarioCurve.reduce((a, p) => a + p.price_usd_per_hour, 0) /
    Math.max(1, scenarioCurve.length)
  const rel = meanPrice > 0 ? stdev / meanPrice : 0.1
  const band = Math.max(0.05, rel) * Math.abs(savingEstimateUsd)

  return {
    recommendation: {
      reservedPct: inputs.reservedPct,
      horizonMonths: inputs.horizonMonths,
      gpuType,
      mix,
      baselineCostUsd: Number(baselineCost.toFixed(2)),
      strategyCostUsd: Number(strategyCost.toFixed(2)),
    },
    savingEstimateUsd: Number(savingEstimateUsd.toFixed(2)),
    confidence: {
      low: Number((savingEstimateUsd - band).toFixed(2)),
      high: Number((savingEstimateUsd + band).toFixed(2)),
    },
    rationale: buildRationale({
      gpuType,
      reservedPct: inputs.reservedPct,
      horizonMonths: inputs.horizonMonths,
      scenario: inputs.scenario,
      meanHours,
      floorHours,
      lockPrice,
      meanPrice,
      savingEstimateUsd,
    }),
    breakEvenMonthOffset,
    provenance: {
      curvePointCount: curve.length,
      usageDayCount: usage.length,
      scenario: inputs.scenario,
      horizonMonths: inputs.horizonMonths,
      reservedPct: inputs.reservedPct,
    },
  }
}

function buildRationale(x: {
  gpuType: string
  reservedPct: number
  horizonMonths: number
  scenario: string
  meanHours: number
  floorHours: number
  lockPrice: number
  meanPrice: number
  savingEstimateUsd: number
}): string {
  const dir =
    x.savingEstimateUsd > 0
      ? 'reserving now beats staying all-on-demand'
      : 'staying flexible beats reserving now'
  const curveMove =
    x.lockPrice < x.meanPrice
      ? `the forward curve prices ${x.gpuType} ${((1 - x.lockPrice / x.meanPrice) * 100).toFixed(1)}% above today's reservation rate on average`
      : `today's reservation rate is near or above the forward-curve mean`
  return (
    `Under the ${x.scenario} scenario over ${x.horizonMonths} months, ${dir}. ` +
    `Steady floor is ${x.floorHours.toFixed(0)} GPU-h/day, mean demand ${x.meanHours.toFixed(0)} GPU-h/day; ` +
    `reserving ${(x.reservedPct * 100).toFixed(0)}% of mean demand locks in ` +
    `$${x.lockPrice.toFixed(3)}/GPU-h vs a curve mean of $${x.meanPrice.toFixed(3)}/GPU-h — ` +
    `${curveMove}.`
  )
}
