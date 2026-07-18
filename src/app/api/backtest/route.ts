import { NextRequest, NextResponse } from 'next/server'
import { backtest, synthesizeHistoricalCurve } from '@/lib/backtest/runner'
import { getDatadogClient } from '@/lib/datadog/client'
import { toDailyRows } from '@/lib/datadog/fixtures'
import { getOrnnClient } from '@/lib/ornn/client'
import { createClient } from '@/lib/supabase/server'
import type { BacktestStrategy, CurveScenario } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

interface BacktestBody {
  workloadId: string
  strategy: BacktestStrategy
  windowStart?: string // ISO date
  windowEnd?: string   // ISO date
}

// POST /api/backtest
// Runs a walk-forward backtest of the given strategy against the customer's
// historical usage and a historical curve. Returns cumulative $ saved,
// hit rate, worst month, and monthly breakdown. Persists to `backtests`.
export async function POST(req: NextRequest) {
  let body: BacktestBody
  try {
    body = (await req.json()) as BacktestBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const { workloadId, strategy } = body ?? {}
  if (!workloadId || !strategy) {
    return NextResponse.json(
      { error: 'workloadId and strategy are required' },
      { status: 400 },
    )
  }
  if (!validScenario(strategy.scenario)) {
    return NextResponse.json({ error: 'invalid scenario' }, { status: 400 })
  }
  const nowMs = Date.now()
  const windowEnd = body.windowEnd ?? new Date(nowMs).toISOString().slice(0, 10)
  const windowStart =
    body.windowStart ??
    new Date(nowMs - 365 * 86_400_000).toISOString().slice(0, 10)

  const dd = getDatadogClient()
  const ornn = getOrnnClient()

  const workloads = await dd.listWorkloads()
  const workload = workloads.find((w) => w.id === workloadId)
  if (!workload) {
    return NextResponse.json({ error: 'unknown workloadId' }, { status: 404 })
  }

  const [usageSeries, curveSnap] = await Promise.all([
    dd.getUsageSeries(workloadId, windowStart, windowEnd),
    ornn.getForwardCurve(workload.gpuType, 180),
  ])
  const usage = toDailyRows(usageSeries).map((r) => ({
    day: r.day,
    gpuHours: r.gpuHours,
    onDemandHours: r.onDemandHours,
    reservedHours: r.reservedHours,
    costUsd: r.costUsd,
  }))

  const historicalCurve = synthesizeHistoricalCurve(
    curveSnap.points,
    windowStart,
    windowEnd,
  )

  const result = backtest({
    gpuType: workload.gpuType,
    usage,
    historicalCurve,
    strategy,
    windowStart,
    windowEnd,
  })

  let backtestId: string | undefined
  let persisted = false

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('backtests')
        .insert({
          workload_id: workloadId,
          strategy: strategy as never,
          window_start: windowStart,
          window_end: windowEnd,
          cumulative_saving_usd: result.cumulativeSavingUsd,
          hit_rate: result.hitRate,
          worst_month: result.worstMonth as never,
          monthly: result.monthly as never,
        })
        .select('id')
        .single()
      if (!error && data) {
        backtestId = data.id
        persisted = true
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    backtestId,
    persisted,
    workload: { id: workload.id, name: workload.name, gpuType: workload.gpuType },
    strategy,
    ...result,
  })
}

function validScenario(s: unknown): s is CurveScenario {
  return s === 'market' || s === 'bull' || s === 'bear' || s === 'flat'
}
