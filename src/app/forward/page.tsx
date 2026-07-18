'use client'

import { useEffect, useMemo, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { ForwardChart } from '@/components/imx/forward-chart'
import { StrategyChip, type StrategyKey } from '@/components/imx/strategy-chip'
import { GpuPicker } from '@/components/imx/gpu-picker'
import { GpuCompare, type GpuCompareRow } from '@/components/imx/gpu-compare'
import { SpotHistoryChart } from '@/components/imx/spot-history-chart'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  BackButton,
  Glossary,
  LiveBadge,
  NavBar,
  StatWidget,
  WidgetCard,
} from '@/components/imx/widget'
import { formatPct, formatSignedUsd, formatUsd } from '@/lib/imx/format'
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
  spotUsdPerHour?: number
  onDemandCostUsd: number
  strategies: Record<StrategyKey, StrategyRow>
}

interface Chip {
  gpuType: string
  displayName: string
}

export default function ForwardPage() {
  const [chips, setChips] = useState<Chip[]>([])
  const [gpuType, setGpuType] = useState<string>('A100')
  const [dataByGpu, setDataByGpu] = useState<
    Record<string, ForwardStrategiesResponse>
  >({})
  const [loadingByGpu, setLoadingByGpu] = useState<Record<string, boolean>>({})
  const [errorByGpu, setErrorByGpu] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<StrategyKey>('smartBlend')
  const [historyDays, setHistoryDays] = useState<30 | 90 | 365>(90)
  const [historyPoints, setHistoryPoints] = useState<CurvePoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ornn/chips')
      .then((r) => r.json())
      .then((j: { chips?: Chip[] }) => {
        if (cancelled) return
        const list = j.chips ?? []
        setChips(list)
        if (list.length > 0 && !list.some((c) => c.gpuType === gpuType)) {
          setGpuType(list[0].gpuType)
        }
      })
      .catch(() => {
        if (cancelled) return
        setChips([
          { gpuType: 'A100', displayName: 'NVIDIA A100' },
          { gpuType: 'B200', displayName: 'NVIDIA B200' },
          { gpuType: 'H100', displayName: 'NVIDIA H100' },
          { gpuType: 'H200', displayName: 'NVIDIA H200' },
          { gpuType: 'RTX 5090', displayName: 'NVIDIA RTX 5090' },
          { gpuType: 'RTX PRO 6000', displayName: 'NVIDIA RTX PRO 6000' },
        ])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (chips.length === 0) return
    let cancelled = false
    chips.forEach((chip) => {
      if (dataByGpu[chip.gpuType]) return
      setLoadingByGpu((m) => ({ ...m, [chip.gpuType]: true }))
      fetch('/api/forward-strategies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gpuType: chip.gpuType }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`status ${res.status}`)
          return (await res.json()) as ForwardStrategiesResponse
        })
        .then((json) => {
          if (cancelled) return
          setDataByGpu((m) => ({ ...m, [chip.gpuType]: json }))
        })
        .catch(() => {
          if (cancelled) return
          setErrorByGpu((m) => ({ ...m, [chip.gpuType]: true }))
        })
        .finally(() => {
          if (cancelled) return
          setLoadingByGpu((m) => ({ ...m, [chip.gpuType]: false }))
        })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips])

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    const params = new URLSearchParams({
      gpuType,
      days: String(historyDays),
    })
    fetch(`/api/ornn/spot-history?${params}`)
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`)
        return j as { points: CurvePoint[] }
      })
      .then((j) => {
        if (cancelled) return
        setHistoryPoints(j.points)
      })
      .catch((err) => {
        if (cancelled) return
        setHistoryError(err instanceof Error ? err.message : 'history failed')
        setHistoryPoints([])
      })
      .finally(() => {
        if (cancelled) return
        setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gpuType, historyDays])

  const data = dataByGpu[gpuType]
  const loading = loadingByGpu[gpuType] ?? true
  const error = errorByGpu[gpuType] ?? false
  const selectedRow = data?.strategies[selected]
  const savingPositive = (selectedRow?.savingUsd ?? 0) > 0

  const compareRows: GpuCompareRow[] = useMemo(() => {
    return chips.map((c) => {
      const d = dataByGpu[c.gpuType]
      const l = loadingByGpu[c.gpuType]
      const e = errorByGpu[c.gpuType]
      if (!d) {
        return {
          gpuType: c.gpuType,
          displayName: c.displayName,
          savingUsd: 0,
          savingPct: 0,
          loading: !!l,
          error: !!e,
        }
      }
      const row = d.strategies.smartBlend
      return {
        gpuType: c.gpuType,
        displayName: c.displayName,
        savingUsd: row.savingUsd,
        savingPct: row.savingPct,
      }
    })
  }, [chips, dataByGpu, loadingByGpu, errorByGpu])

  return (
    <main className="imx-grid min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-3">
          <BackButton />
        </div>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="imx-heading imx-gradient-text text-2xl">
              Forward Curve
            </h1>
            <p className="text-sm text-muted-foreground">
              Hedging with real-time Ornn forwards.
            </p>
          </div>
          <LiveBadge source="ORNN LIVE" />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatWidget
            label="12-MO ON-DEMAND"
            value={data ? formatUsd(data.onDemandCostUsd) : '—'}
            hint={`${gpuType} fleet, on-demand baseline`}
          />
          <StatWidget
            label="WITH SMART BLEND"
            value={
              data ? formatUsd(data.strategies.smartBlend.costUsd) : '—'
            }
            delta={
              data
                ? formatPct(data.strategies.smartBlend.savingPct)
                : undefined
            }
            deltaTone="down"
            hint="Optimizer's default pick"
            glow
          />
          <StatWidget
            label="HEDGE SAVES (selected)"
            value={selectedRow ? formatSignedUsd(selectedRow.savingUsd) : '—'}
            delta={
              selectedRow ? formatPct(selectedRow.savingPct) : undefined
            }
            deltaTone={savingPositive ? 'up' : 'flat'}
            hint="Live from your selected strategy"
          />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <WidgetCard
              label="SPOT HISTORY"
              className="mb-4"
              action={
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    size="sm"
                    variant="outline"
                    orientation="horizontal"
                    value={[String(historyDays)]}
                    onValueChange={(next) => {
                      const n = Number(next[0])
                      if (n === 30 || n === 90 || n === 365) setHistoryDays(n)
                    }}
                  >
                    {[30, 90, 365].map((d) => (
                      <ToggleGroupItem
                        key={d}
                        value={String(d)}
                        aria-label={`${d} days`}
                      >
                        {d === 365 ? '1Y' : `${d}D`}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <LiveBadge source="ORNN LIVE" />
                </div>
              }
            >
              <p className="mb-2 text-xs text-muted-foreground">
                Trailing spot for {gpuType} — where we came from, priced against
                the forward below.
              </p>
              {historyLoading ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  Loading history…
                </div>
              ) : historyError ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-destructive">
                  {historyError}
                </div>
              ) : historyPoints.length > 0 ? (
                <SpotHistoryChart points={historyPoints} />
              ) : null}
            </WidgetCard>

            <WidgetCard
              label="SPOT VS FORWARD"
              size="lg"
              action={
                <span className="text-xs text-muted-foreground">
                  180-day horizon · {gpuType}
                </span>
              }
            >
              <div className="imx-heading text-lg">
                Hedging with the forward curve
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Red = today&apos;s spot. Green = 180-day forward. Blue shaded
                area = the hedge gap (diagonal stripes on Smart blend).
              </p>
              {loading ? (
                <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                  Loading forward curve...
                </div>
              ) : error ? (
                <div className="flex h-[360px] items-center justify-center text-sm text-destructive">
                  Failed to load forward curve
                </div>
              ) : data ? (
                <ForwardChart
                  curve={data.curve}
                  highlightStrategy={selected}
                  spotUsdPerHour={data.spotUsdPerHour}
                />
              ) : null}
            </WidgetCard>

            <Glossary
              className="mt-4"
              title="HOW TO READ THIS"
              terms={[
                {
                  term: 'Spot',
                  def: "Today's on-demand GPU price — what you pay if you rent right now.",
                },
                {
                  term: 'Forward',
                  def: 'A locked-in future price. Usually cheaper than spot when the market expects supply.',
                },
                {
                  term: 'Hedge gap (blue)',
                  def: 'Distance between spot and forward. Bigger gap = bigger potential saving.',
                },
                {
                  term: 'Smart blend',
                  def: "The optimizer's pick: reserve steady demand, burst the rest on-demand.",
                },
                {
                  term: 'Pay-as-you-go',
                  def: 'Rent everything on-demand. Max flexibility, no discount.',
                },
                {
                  term: 'Reserve now',
                  def: 'Lock every GPU-hour on the forward. Max hedge, min flexibility.',
                },
              ]}
            />
          </div>

          <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <WidgetCard
              label="GPU"
              action={
                <span className="text-xs text-muted-foreground">
                  {chips.length} available
                </span>
              }
            >
              <GpuPicker chips={chips} value={gpuType} onChange={setGpuType} />
            </WidgetCard>

            <WidgetCard label="CROSS-GPU COMPARE">
              <p className="mb-2 text-xs text-muted-foreground">
                Which chip saves the most on Smart blend? Click one to switch.
              </p>
              <GpuCompare
                rows={compareRows}
                selected={gpuType}
                onSelect={setGpuType}
              />
            </WidgetCard>

            <WidgetCard label="CHOOSE STRATEGY">
              <StrategyChip value={selected} onChange={setSelected} />
            </WidgetCard>

            <WidgetCard label="STRATEGY BREAKDOWN">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="imx-mono-label">12-mo on-demand</span>
                  <span className="imx-heading text-lg">
                    {data ? formatUsd(data.onDemandCostUsd) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="imx-mono-label">With this strategy</span>
                  <span className="imx-heading text-lg">
                    {selectedRow ? formatUsd(selectedRow.costUsd) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="imx-mono-label">Hedge saves</span>
                  <span
                    className={cn(
                      'imx-heading text-lg',
                      savingPositive ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    {selectedRow
                      ? `${formatSignedUsd(selectedRow.savingUsd)} · ${formatPct(selectedRow.savingPct)}`
                      : '—'}
                  </span>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard>
              <a
                href="/sandbox"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'w-full',
                )}
              >
                Configure your own →
              </a>
            </WidgetCard>
          </div>
        </div>
      </div>
    </main>
  )
}
