import type {
  BacktestMonthly,
  BacktestStrategy,
  CurvePoint,
  CurveScenario,
  Recommendation,
  RecommendInputs,
  RecommendedMixRow,
} from '@/lib/supabase/database.types'

export type {
  BacktestMonthly,
  BacktestStrategy,
  CurvePoint,
  CurveScenario,
  Recommendation,
  RecommendInputs,
  RecommendedMixRow,
}

// Daily row of a workload's historical (or projected-forward baseline) usage.
export interface UsageDay {
  day: string // ISO date
  gpuHours: number
  onDemandHours: number
  reservedHours: number
  costUsd: number
}

// Discount curve: reservation term (months) -> discount fraction off the market
// price. Same shape as the concept doc's "30% for 6mo, 40% for 12mo, ...".
export type DiscountSchedule = Record<number, number>

export const DEFAULT_DISCOUNT_SCHEDULE: DiscountSchedule = {
  3: 0.2,
  6: 0.3,
  12: 0.4,
  36: 0.5,
}

export interface EngineArgs {
  gpuType: string
  curve: CurvePoint[] // forward curve, ascending in t
  usage: UsageDay[] // historical daily usage, ascending in day
  inputs: RecommendInputs
  discounts?: DiscountSchedule
}

export interface EngineOutput {
  recommendation: Recommendation
  savingEstimateUsd: number
  confidence: { low: number; high: number }
  rationale: string
  breakEvenMonthOffset: number | null
  provenance: {
    curvePointCount: number
    usageDayCount: number
    scenario: CurveScenario
    horizonMonths: number
    reservedPct: number
  }
}
