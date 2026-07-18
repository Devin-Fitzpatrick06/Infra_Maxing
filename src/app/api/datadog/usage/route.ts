import { NextRequest, NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'
import { toDailyRows } from '@/lib/datadog/fixtures'

export const dynamic = 'force-dynamic'

// GET /api/datadog/usage?workloadId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns daily-rollup rows plus the raw Datadog-shaped series for provenance.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workloadId = searchParams.get('workloadId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!workloadId || !from || !to) {
    return NextResponse.json(
      { error: 'workloadId, from, and to are required' },
      { status: 400 },
    )
  }
  if (!isISODate(from) || !isISODate(to)) {
    return NextResponse.json(
      { error: 'from/to must be YYYY-MM-DD' },
      { status: 400 },
    )
  }

  const dd = getDatadogClient()
  const series = await dd.getUsageSeries(workloadId, from, to)
  const daily = toDailyRows(series)

  return NextResponse.json({
    workloadId,
    from,
    to,
    daily,
    series,
  })
}

function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}
