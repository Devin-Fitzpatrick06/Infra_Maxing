'use client'

import type { PortfolioOutput } from '@/lib/engine/portfolio'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPct, formatSignedUsd, formatUsd } from '@/lib/imx/format'
import { ComparisonBars } from './comparison-bars'

interface ImxCallProps {
  portfolio: PortfolioOutput
  loading?: boolean
}

export function ImxCall({ portfolio, loading = false }: ImxCallProps) {
  const isEmpty = portfolio.provenance.workloadCount === 0
  const { headline, rationale } = portfolio.recommendation
  const horizonMonths = portfolio.inputs.horizonMonths

  const sources = Object.values(portfolio.provenance.curveSources)
  const firstSource = sources[0] ?? 'ornn_fixture'
  const sourceLabel = firstSource === 'ornn_http' ? 'Ornn live' : 'Ornn fixture'
  const sourceClass =
    firstSource === 'ornn_http'
      ? 'text-primary border border-primary/40'
      : 'text-muted-foreground border border-border'

  const savingUsd = portfolio.totals.savingUsd
  const savingTone =
    savingUsd > 0
      ? 'text-primary'
      : savingUsd < 0
        ? 'text-destructive'
        : 'text-foreground'

  const workloadCount = portfolio.provenance.workloadCount
  const workloadWord = workloadCount === 1 ? 'workload' : 'workloads'

  return (
    <Card
      className={cn(
        'relative ring-1 ring-primary/25',
        loading && 'opacity-60',
      )}
    >
      {loading && (
        <span className="pointer-events-none absolute right-4 top-4 text-xs text-muted-foreground">
          recalculating…
        </span>
      )}

      <CardHeader>
        <CardTitle className="imx-heading text-2xl leading-tight">
          {isEmpty ? 'Pick at least one workload.' : headline}
        </CardTitle>
        {!isEmpty && (
          <CardDescription className="text-sm text-muted-foreground">
            {rationale}
          </CardDescription>
        )}
      </CardHeader>

      {!isEmpty && (
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="grid grid-cols-3 gap-4">
              <Kpi
                label={`Projected ${horizonMonths}-mo cost`}
                value={formatUsd(portfolio.totals.strategyCostUsd)}
              />
              <Kpi
                label="Savings vs on-demand"
                value={formatSignedUsd(savingUsd)}
                tone={savingTone}
              />
              <Kpi
                label="% saved"
                value={formatPct(portfolio.totals.savingPct)}
              />
            </div>
          </div>

          <ComparisonBars
            onDemand={portfolio.totals.onDemandCostUsd}
            reserveAll={portfolio.strategies.reserveNow.costUsd}
            smartBlend={portfolio.strategies.smartBlend.costUsd}
          />
        </CardContent>
      )}

      {!isEmpty && (
        <CardFooter className="flex-wrap gap-2">
          <Badge variant="secondary">
            ~{portfolio.timeSavedHours} hrs/yr saved
          </Badge>
          <Badge variant="outline">
            Monthly run-rate {formatUsd(portfolio.monthlyRunRateUsd)}
          </Badge>
          <Badge variant="outline">
            {workloadCount} {workloadWord}
          </Badge>
          <Badge variant="ghost" className={sourceClass}>
            {sourceLabel}
          </Badge>
        </CardFooter>
      )}
    </Card>
  )
}

interface KpiProps {
  label: string
  value: string
  tone?: string
}

function Kpi({ label, value, tone }: KpiProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn('imx-heading text-2xl leading-tight', tone)}>
        {value}
      </span>
    </div>
  )
}
