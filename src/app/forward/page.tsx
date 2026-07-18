'use client'

import { useEffect, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ForwardChart } from '@/components/imx/forward-chart'
import { StrategyChip, type StrategyKey } from '@/components/imx/strategy-chip'
import { formatUsd, formatSignedUsd, formatPct } from '@/lib/imx/format'
import { cn } from '@/lib/utils'

interface CurvePoint {
  t: string
  price_usd_per_hour: number
}

interface StrategyRow {
  costUsd: number
  savingUsd: number
  savingPct: number
}

interface ForwardStrategiesResponse {
  gpuType: string
  curve: CurvePoint[]
  curveSource?: string
  curveFetchedAt?: string
  onDemandCostUsd: number
  strategies: Record<StrategyKey, StrategyRow>
}

export default function ForwardPage() {
  const [data, setData] = useState<ForwardStrategiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<StrategyKey>('smartBlend')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/forward-strategies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gpuType: 'H100' }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return (await res.json()) as ForwardStrategiesResponse
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load forward curve')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedRow = data?.strategies[selected]
  const savingPositive = (selectedRow?.savingUsd ?? 0) > 0

  const sourceLabel =
    data?.curveSource === 'live' ? 'Ornn live' : 'Ornn fixture'
  const chipText = `H100 · 180-day horizon · ${data ? sourceLabel : 'Ornn live/fixture'}`

  return (
    <main className="imx-grid min-h-screen">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="imx-heading text-lg text-primary">
            INFRA-MAXXER — Forward Curve
          </h1>
          <span className="rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
            {chipText}
          </span>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="imx-heading text-xl">
                  Hedging with the forward curve
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Red = today&apos;s spot. Mint = 180-day forward. Shaded area =
                  savings if you lock now.
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : error ? (
                  <div className="flex h-[360px] items-center justify-center text-sm text-destructive">
                    {error}
                  </div>
                ) : data ? (
                  <ForwardChart
                    curve={data.curve}
                    highlightStrategy={selected}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="imx-heading text-lg">
                  Choose your strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <StrategyChip value={selected} onChange={setSelected} />

                <div className="rounded-lg border border-border bg-card/40 p-4">
                  <div className="flex flex-col gap-4">
                    <SummaryRow
                      label="12-mo on-demand"
                      value={data ? formatUsd(data.onDemandCostUsd) : '—'}
                    />
                    <SummaryRow
                      label="With this strategy"
                      value={
                        selectedRow ? formatUsd(selectedRow.costUsd) : '—'
                      }
                    />
                    <SummaryRow
                      label="Hedge saves"
                      value={
                        selectedRow
                          ? `${formatSignedUsd(selectedRow.savingUsd)} · ${formatPct(selectedRow.savingPct)}`
                          : '—'
                      }
                      valueClassName={cn(
                        savingPositive ? 'text-primary' : 'text-destructive',
                      )}
                    />
                  </div>
                </div>

                <a
                  href="/sandbox"
                  className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
                >
                  Configure your own →
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn('imx-heading text-xl', valueClassName)}>{value}</span>
    </div>
  )
}
