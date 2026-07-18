import { NextRequest, NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'
import { getOrnnClient } from '@/lib/ornn/client'
import {
  recommendPortfolio,
  type PortfolioInputs,
} from '@/lib/engine/portfolio'

export const dynamic = 'force-dynamic'

interface PortfolioBody {
  inputs: PortfolioInputs
}

const VALID_HORIZONS = [3, 6, 12, 36] as const
const VALID_SCENARIOS = ['market', 'stress'] as const

export async function POST(req: NextRequest) {
  let body: PortfolioBody
  try {
    body = (await req.json()) as PortfolioBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const inputs = body?.inputs
  const invalid = validateInputs(inputs)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const ornn = getOrnnClient()
  const datadog = getDatadogClient()

  try {
    const output = await recommendPortfolio(inputs, { ornn, datadog })
    return NextResponse.json(output)
  } catch {
    return NextResponse.json(
      { error: 'portfolio computation failed' },
      { status: 500 },
    )
  }
}

function validateInputs(inputs: PortfolioInputs | undefined): string | null {
  if (!inputs || typeof inputs !== 'object') {
    return 'inputs is required'
  }
  if (
    !Array.isArray(inputs.workloadIds) ||
    inputs.workloadIds.length < 1 ||
    !inputs.workloadIds.every((id) => typeof id === 'string' && id.length > 0)
  ) {
    return 'inputs.workloadIds must be a non-empty array of strings'
  }
  if (
    !VALID_HORIZONS.includes(
      inputs.horizonMonths as (typeof VALID_HORIZONS)[number],
    )
  ) {
    return 'inputs.horizonMonths must be one of 3, 6, 12, 36'
  }
  if (
    !VALID_SCENARIOS.includes(
      inputs.scenario as (typeof VALID_SCENARIOS)[number],
    )
  ) {
    return 'inputs.scenario must be market|stress'
  }
  if (
    typeof inputs.growthPctYr !== 'number' ||
    !Number.isFinite(inputs.growthPctYr) ||
    inputs.growthPctYr < -50 ||
    inputs.growthPctYr > 100
  ) {
    return 'inputs.growthPctYr must be a number in [-50, 100]'
  }
  if (
    typeof inputs.baselineSharePct !== 'number' ||
    !Number.isFinite(inputs.baselineSharePct) ||
    inputs.baselineSharePct < 0 ||
    inputs.baselineSharePct > 100
  ) {
    return 'inputs.baselineSharePct must be a number in [0, 100]'
  }
  if (
    typeof inputs.forwardVsTodayPct !== 'number' ||
    !Number.isFinite(inputs.forwardVsTodayPct) ||
    inputs.forwardVsTodayPct < -60 ||
    inputs.forwardVsTodayPct > 0
  ) {
    return 'inputs.forwardVsTodayPct must be a number in [-60, 0]'
  }
  return null
}
