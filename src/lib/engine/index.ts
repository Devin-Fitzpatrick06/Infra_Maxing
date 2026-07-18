export { recommend } from './model'
export { applyScenario } from './scenarios'
export {
  meanDailyHours,
  steadyFloorHours,
  priceAtMonth,
  curveStdev,
} from './math'
export type {
  CurvePoint,
  CurveScenario,
  DiscountSchedule,
  EngineArgs,
  EngineOutput,
  Recommendation,
  RecommendInputs,
  RecommendedMixRow,
  UsageDay,
} from './types'
export { DEFAULT_DISCOUNT_SCHEDULE } from './types'
