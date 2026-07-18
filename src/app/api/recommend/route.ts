import { NextRequest, NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'
import { toDailyRows } from '@/lib/datadog/fixtures'
import { recommend } from '@/lib/engine'
import { getOrnnClient } from '@/lib/ornn/client'
import { createClient } from '@/lib/supabase/server'
import type { RecommendInputs } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

interface RecommendBody {
  workloadId: string
  inputs: RecommendInputs
  question?: string
  horizonDays?: number
  historyDays?: number
}

// POST /api/recommend
// Composes: Ornn curve fetch + Datadog usage fetch + engine.recommend, then
// persists a decisions row. Deterministic given the same body + same-day
// Ornn curve. Returns the engine output + decision_id.
export async function POST(req: NextRequest) {
  let body: RecommendBody
  try {
    body = (await req.json()) as RecommendBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const { workloadId, inputs, question, horizonDays = 180, historyDays = 120 } =
    body ?? {}

  if (!workloadId || !inputs) {
    return NextResponse.json(
      { error: 'workloadId and inputs are required' },
      { status: 400 },
    )
  }
  const invalid = validateInputs(inputs)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const dd = getDatadogClient()
  const ornn = getOrnnClient()

  const workloads = await dd.listWorkloads()
  const workload = workloads.find((w) => w.id === workloadId)
  if (!workload) {
    return NextResponse.json({ error: 'unknown workloadId' }, { status: 404 })
  }

  // History window ends today, spans `historyDays` days back.
  const toMs = Date.now()
  const fromMs = toMs - historyDays * 86_400_000
  const toISO = new Date(toMs).toISOString().slice(0, 10)
  const fromISO = new Date(fromMs).toISOString().slice(0, 10)

  const [usageSeries, curveSnap] = await Promise.all([
    dd.getUsageSeries(workloadId, fromISO, toISO),
    ornn.getForwardCurve(inputs.gpuType ?? workload.gpuType, horizonDays),
  ])
  const usage = toDailyRows(usageSeries)

  const output = recommend({
    gpuType: inputs.gpuType ?? workload.gpuType,
    curve: curveSnap.points,
    usage: usage.map((r) => ({
      day: r.day,
      gpuHours: r.gpuHours,
      onDemandHours: r.onDemandHours,
      reservedHours: r.reservedHours,
      costUsd: r.costUsd,
    })),
    inputs,
  })

  const datadogQueries = [
    usageSeries.gpuHours.query,
    usageSeries.gpuUtilization.query,
    usageSeries.costUsd.query,
  ]

  let decisionId: string | undefined
  let persisted = false

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('decisions')
        .insert({
          workload_id: workloadId,
          question: question ?? null,
          inputs: inputs as never,
          recommendation: output.recommendation as never,
          saving_estimate_usd: output.savingEstimateUsd,
          confidence_low_usd: output.confidence.low,
          confidence_high_usd: output.confidence.high,
          rationale: output.rationale,
          curve_snapshot_id: null,
          datadog_queries: datadogQueries,
        })
        .select('id')
        .single()
      if (!error && data) {
        decisionId = data.id
        persisted = true
      }
    } catch {
      // proceed without persistence
    }
  }

  return NextResponse.json({
    decisionId,
    persisted,
    workload: { id: workload.id, name: workload.name, gpuType: workload.gpuType },
    inputs,
    recommendation: output.recommendation,
    savingEstimateUsd: output.savingEstimateUsd,
    confidence: output.confidence,
    rationale: output.rationale,
    breakEvenMonthOffset: output.breakEvenMonthOffset,
    provenance: {
      ornn: {
        source: curveSnap.source,
        fetchedAt: curveSnap.fetchedAt,
        horizonDays: curveSnap.horizonDays,
        pointCount: curveSnap.points.length,
      },
      datadog: {
        from: fromISO,
        to: toISO,
        queries: datadogQueries,
      },
      engine: output.provenance,
    },
  })
}

function validateInputs(inputs: RecommendInputs): string | null {
  if (typeof inputs.reservedPct !== 'number' || inputs.reservedPct < 0 || inputs.reservedPct > 1) {
    return 'inputs.reservedPct must be 0..1'
  }
  if (![3, 6, 12, 36].includes(inputs.horizonMonths)) {
    return 'inputs.horizonMonths must be one of 3, 6, 12, 36'
  }
  if (typeof inputs.usageBias !== 'number' || inputs.usageBias < -0.25 || inputs.usageBias > 0.25) {
    return 'inputs.usageBias must be -0.25..0.25'
  }
  if (!['market', 'bull', 'bear', 'flat'].includes(inputs.scenario)) {
    return 'inputs.scenario must be market|bull|bear|flat'
  }
  return null
}
