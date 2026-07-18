import type { CurvePoint, CurveScenario } from './types'

// Apply a scenario perturbation to a base (market) forward curve. Deterministic.
// - market: pass-through
// - bull:   multiplicative uplift growing with tenor (prices rise faster)
// - bear:   multiplicative discount growing with tenor
// - flat:   collapse to the front-month price for the whole horizon
export function applyScenario(
  base: CurvePoint[],
  scenario: CurveScenario,
): CurvePoint[] {
  if (base.length === 0) return base
  if (scenario === 'market') return base.map((p) => ({ ...p }))

  if (scenario === 'flat') {
    const front = base[0].price_usd_per_hour
    return base.map((p) => ({ t: p.t, price_usd_per_hour: front }))
  }

  const n = base.length
  return base.map((p, i) => {
    const tenor = n <= 1 ? 0 : i / (n - 1) // 0..1
    // ±20% max at the far tenor, scaling linearly with tenor.
    const factor =
      scenario === 'bull' ? 1 + 0.2 * tenor : /* bear */ 1 - 0.2 * tenor
    return {
      t: p.t,
      price_usd_per_hour: p.price_usd_per_hour * factor,
    }
  })
}
