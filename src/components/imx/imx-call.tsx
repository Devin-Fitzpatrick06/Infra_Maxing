'use client'

import type { PortfolioOutput } from '@/lib/engine/portfolio'
import { cn } from '@/lib/utils'
import { formatPct, formatSignedUsd, formatUsd } from '@/lib/imx/format'
import {
  Gauge,
  LiveBadge,
  StatWidget,
  WidgetCard,
} from '@/components/imx/widget'
import { ComparisonBars } from './comparison-bars'

interface ImxCallProps {
  portfolio: PortfolioOutput
  loading?: boolean
}

export function ImxCall({ portfolio, loading = false }: ImxCallProps) {
  const workloadCount = portfolio.provenance.workloadCount
  const isEmpty = workloadCount === 0
  const { headline, rationale } = portfolio.recommendation
  const horizonMonths = portfolio.inputs.horizonMonths

  const sources = Object.values(portfolio.provenance.curveSources)
  const firstSource = sources[0] ?? 'ornn_fixture'
  const sourceLabelUpper =
    firstSource === 'ornn_http' ? 'ORNN LIVE' : 'ORNN FIXTURE'

  const savingUsd = portfolio.totals.savingUsd
  const savingPct = portfolio.totals.savingPct
  const deltaTone: 'up' | 'down' | 'flat' =
    savingUsd > 0 ? 'up' : savingUsd < 0 ? 'down' : 'flat'

  const workloadWord = workloadCount === 1 ? 'workload' : 'workloads'

  const loadingBadge = loading ? (
    <span className="pointer-events-none absolute right-2 top-2 z-10 animate-pulse text-xs text-muted-foreground">
      recalculating…
    </span>
  ) : null

  if (isEmpty) {
    return (
      <div className="relative">
        {loadingBadge}
        <div className={cn(loading && 'pointer-events-none opacity-60')}>
          <WidgetCard label="INFRA-MAXXER'S CALL" glow>
            <p className="imx-heading text-2xl leading-tight text-muted-foreground">
              Pick at least one workload.
            </p>
          </WidgetCard>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {loadingBadge}
      <div
        className={cn(
          'flex flex-col gap-3',
          loading && 'pointer-events-none opacity-60',
        )}
      >
        <WidgetCard
          label="INFRA-MAXXER'S CALL"
          glow
          interactive={false}
          action={<LiveBadge source={sourceLabelUpper} />}
        >
          <div className="flex flex-col gap-3">
            <p className="imx-heading imx-gradient-text text-3xl leading-tight md:text-4xl">
              {headline}
            </p>
            {rationale && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {rationale}
              </p>
            )}
          </div>
        </WidgetCard>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatWidget
            label={`Projected ${horizonMonths}-mo cost`}
            value={formatUsd(portfolio.totals.strategyCostUsd)}
            hint={`vs. ${formatUsd(portfolio.totals.onDemandCostUsd)} on-demand`}
          />
          <StatWidget
            label="Savings vs. on-demand"
            value={formatSignedUsd(savingUsd)}
            deltaTone={deltaTone}
            delta={formatPct(savingPct)}
            glow
          />
          <StatWidget
            label="Time saved"
            value={`${portfolio.timeSavedHours} h/yr`}
            hint={`${workloadCount} workloads · quarterly cycle`}
          />
        </div>

        <WidgetCard
          label="STRATEGY COMPARISON"
          action={
            <span className="text-xs text-muted-foreground">
              3 canonical strategies
            </span>
          }
        >
          <ComparisonBars
            onDemand={portfolio.totals.onDemandCostUsd}
            reserveAll={portfolio.strategies.reserveNow.costUsd}
            smartBlend={portfolio.strategies.smartBlend.costUsd}
          />
        </WidgetCard>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <WidgetCard label="EFFICIENCY">
            <div className="flex items-center justify-center">
              <Gauge
                value={Math.max(0, savingPct)}
                label="of on-demand cost saved"
              />
            </div>
          </WidgetCard>

          <WidgetCard label="LIVE POSTURE">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="imx-mono-label">Ornn source</span>
                <LiveBadge source={sourceLabelUpper} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="imx-mono-label">Monthly run-rate</span>
                <span className="imx-heading text-lg">
                  {formatUsd(portfolio.monthlyRunRateUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="imx-mono-label">Workloads in scope</span>
                <span className="imx-heading text-lg">
                  {workloadCount} {workloadWord}
                </span>
              </div>
            </div>
          </WidgetCard>
        </div>
      </div>
    </div>
  )
}
