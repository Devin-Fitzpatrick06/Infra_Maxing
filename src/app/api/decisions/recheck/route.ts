import { NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'
import { toDailyRows } from '@/lib/datadog/fixtures'
import { recommend } from '@/lib/engine'
import { getOrnnClient } from '@/lib/ornn/client'
import { createClient } from '@/lib/supabase/server'
import type { RecommendInputs } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// POST /api/decisions/recheck
// Iterates persisted decisions, re-runs the engine with the latest curve +
// usage, and reports which ones would flip (recommendation direction or
// projected saving moving > $50). No cron infra — manual trigger for the demo.
export async function POST() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ shifts: [], persisted: false })
  }

  const supabase = await createClient()
  const { data: decisions, error } = await supabase
    .from('decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dd = getDatadogClient()
  const ornn = getOrnnClient()
  const workloads = await dd.listWorkloads()
  const shifts: Array<{
    decisionId: string
    workloadId: string
    previousSaving: number
    newSaving: number
    delta: number
    directionChanged: boolean
    newRationale: string
  }> = []

  const nowMs = Date.now()
  const toISO = new Date(nowMs).toISOString().slice(0, 10)
  const fromISO = new Date(nowMs - 120 * 86_400_000).toISOString().slice(0, 10)

  for (const d of decisions ?? []) {
    const workload = workloads.find((w) => w.id === d.workload_id)
    if (!workload) continue
    const inputs = d.inputs as RecommendInputs
    const [usageSeries, curveSnap] = await Promise.all([
      dd.getUsageSeries(workload.id, fromISO, toISO),
      ornn.getForwardCurve(inputs.gpuType ?? workload.gpuType, 180),
    ])
    const usage = toDailyRows(usageSeries).map((r) => ({
      day: r.day,
      gpuHours: r.gpuHours,
      onDemandHours: r.onDemandHours,
      reservedHours: r.reservedHours,
      costUsd: r.costUsd,
    }))
    const output = recommend({
      gpuType: inputs.gpuType ?? workload.gpuType,
      curve: curveSnap.points,
      usage,
      inputs,
    })
    const prev = Number(d.saving_estimate_usd)
    const newSaving = output.savingEstimateUsd
    const directionChanged = Math.sign(prev) !== Math.sign(newSaving)
    const delta = newSaving - prev
    if (directionChanged || Math.abs(delta) >= 50) {
      shifts.push({
        decisionId: d.id,
        workloadId: d.workload_id,
        previousSaving: prev,
        newSaving,
        delta: Number(delta.toFixed(2)),
        directionChanged,
        newRationale: output.rationale,
      })
    }
  }

  return NextResponse.json({ shifts, checked: decisions?.length ?? 0 })
}
