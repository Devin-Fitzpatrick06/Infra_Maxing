import { NextRequest, NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'
import { getOrnnClient } from '@/lib/ornn/client'
import { recommendPortfolio } from '@/lib/engine/portfolio'

export const dynamic = 'force-dynamic'

interface ForwardStrategiesBody {
  gpuType?: string
  horizonDays?: number
}

const round2 = (n: number) => Number(n.toFixed(2))

export async function POST(req: NextRequest) {
  let body: ForwardStrategiesBody
  try {
    body = (await req.json()) as ForwardStrategiesBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const gpuType = body?.gpuType ?? 'H100'
  const horizonDays = body?.horizonDays ?? 180

  if (typeof gpuType !== 'string' || gpuType.trim().length === 0) {
    return NextResponse.json(
      { error: 'gpuType must be a non-empty string' },
      { status: 400 },
    )
  }
  if (
    typeof horizonDays !== 'number' ||
    !Number.isInteger(horizonDays) ||
    horizonDays < 30 ||
    horizonDays > 720
  ) {
    return NextResponse.json(
      { error: 'horizonDays must be an integer between 30 and 720' },
      { status: 400 },
    )
  }

  try {
    const ornn = getOrnnClient()
    const datadog = getDatadogClient()

    const [snap, allWorkloads] = await Promise.all([
      ornn.getForwardCurve(gpuType, horizonDays),
      datadog.listWorkloads(),
    ])

    const gpuLower = gpuType.toLowerCase()
    const matched = allWorkloads.filter(
      (w) => w.gpuType.toLowerCase() === gpuLower,
    )
    const portfolioWorkloads = matched.length > 0 ? matched : allWorkloads

    const portfolio = await recommendPortfolio(
      {
        workloadIds: portfolioWorkloads.map((w) => w.id),
        horizonMonths: 12,
        scenario: 'market',
        growthPctYr: 45,
        baselineSharePct: 65,
        forwardVsTodayPct: -27,
      },
      { ornn, datadog },
    )

    const onDemand = portfolio.totals.onDemandCostUsd
    const smart = portfolio.strategies.smartBlend.costUsd
    const reserve = portfolio.strategies.reserveNow.costUsd
    const payGo = portfolio.strategies.payAsYouGo.costUsd

    const smartSaving = onDemand - smart
    const reserveSaving = onDemand - reserve

    return NextResponse.json({
      gpuType,
      curve: snap.points,
      curveSource: snap.source,
      curveFetchedAt: snap.fetchedAt,
      onDemandCostUsd: round2(onDemand),
      strategies: {
        payAsYouGo: {
          costUsd: round2(payGo),
          savingUsd: 0,
          savingPct: 0,
        },
        smartBlend: {
          costUsd: round2(smart),
          savingUsd: round2(smartSaving),
          savingPct: onDemand > 0 ? round2(smartSaving / onDemand) : 0,
        },
        reserveNow: {
          costUsd: round2(reserve),
          savingUsd: round2(reserveSaving),
          savingPct: onDemand > 0 ? round2(reserveSaving / onDemand) : 0,
        },
      },
      portfolio,
    })
  } catch {
    return NextResponse.json(
      { error: 'forward-strategies computation failed' },
      { status: 500 },
    )
  }
}
