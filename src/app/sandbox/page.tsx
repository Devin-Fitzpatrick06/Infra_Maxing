'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PortfolioInputs,
  PortfolioOutput,
} from '@/lib/engine/portfolio'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import { SliderRow } from '@/components/imx/slider-row'
import { WorkloadSelect } from '@/components/imx/workload-select'
import { ScenarioToggle } from '@/components/imx/scenario-toggle'
import { ImxCall } from '@/components/imx/imx-call'

interface Workload {
  id: string
  name: string
  gpuType: string
  archetype?: string
}

type HorizonMonths = 3 | 6 | 12 | 36

const HORIZONS: HorizonMonths[] = [3, 6, 12, 36]
const HORIZON_LABELS: Record<HorizonMonths, string> = {
  3: '3M',
  6: '6M',
  12: '1Y',
  36: '3Y',
}

export default function SandboxPage() {
  const [workloads, setWorkloads] = useState<Workload[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [horizonMonths, setHorizonMonths] = useState<HorizonMonths>(12)
  const [scenario, setScenario] = useState<'market' | 'stress'>('market')
  const [growthPctYr, setGrowth] = useState(45)
  const [baselineSharePct, setBaseline] = useState(65)
  const [forwardVsTodayPct, setForward] = useState(-27)
  const [portfolio, setPortfolio] = useState<PortfolioOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/datadog/workloads')
      .then((r) => r.json())
      .then((j: { workloads: Workload[] }) => {
        if (cancelled) return
        setWorkloads(j.workloads)
        setSelectedIds(j.workloads.map((w) => w.id))
      })
      .catch((e) => console.error('failed to load workloads', e))
    return () => {
      cancelled = true
    }
  }, [])

  const fetchPortfolio = useCallback(
    (inputs: PortfolioInputs) => {
      setLoading(true)
      fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inputs }),
      })
        .then(async (r) => {
          const j = await r.json()
          if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`)
          setPortfolio(j as PortfolioOutput)
        })
        .catch((e) => {
          console.error('portfolio fetch failed', e)
        })
        .finally(() => setLoading(false))
    },
    [],
  )

  useEffect(() => {
    if (selectedIds.length === 0) return
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }
    const inputs: PortfolioInputs = {
      workloadIds: selectedIds,
      horizonMonths,
      scenario,
      growthPctYr,
      baselineSharePct,
      forwardVsTodayPct,
    }
    debounceRef.current = window.setTimeout(() => {
      fetchPortfolio(inputs)
    }, 150)
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [
    selectedIds,
    horizonMonths,
    scenario,
    growthPctYr,
    baselineSharePct,
    forwardVsTodayPct,
    fetchPortfolio,
  ])

  const gpuSummary = summarizeGpuTypes(workloads)
  const workloadsReady = workloads.length > 0

  return (
    <main className="imx-grid min-h-screen p-6">
      <header className="mx-auto mb-6 flex max-w-7xl items-baseline justify-between">
        <span className="imx-heading text-lg text-primary">
          INFRA-MAXXER — Sandbox
        </span>
        <span className="text-xs text-muted-foreground">{gpuSummary}</span>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="imx-heading text-xl">Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {workloadsReady ? (
                <WorkloadSelect
                  workloads={workloads}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  loading workloads...
                </div>
              )}

              <SliderRow
                label="Expected workload growth"
                value={growthPctYr}
                min={-50}
                max={100}
                step={5}
                format={(v) => `${v >= 0 ? '+' : ''}${v}% / yr`}
                hint="Larger = more compute demand."
                onChange={setGrowth}
              />

              <SliderRow
                label="Baseline share reserved"
                value={baselineSharePct}
                min={0}
                max={100}
                step={5}
                format={(v) => `${v}%`}
                hint="Portion of steady demand covered by the forward."
                onChange={setBaseline}
              />

              <SliderRow
                label="Forward vs. today"
                value={forwardVsTodayPct}
                min={-60}
                max={0}
                step={1}
                format={(v) => `${v}%`}
                hint="How much cheaper the forward is vs spot."
                onChange={setForward}
              />

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-foreground">Horizon</Label>
                <ToggleGroup
                  className="w-full"
                  size="sm"
                  variant="outline"
                  orientation="horizontal"
                  value={[String(horizonMonths)]}
                  onValueChange={(next) => {
                    const picked = next[0]
                    const n = Number(picked)
                    if (
                      n === 3 ||
                      n === 6 ||
                      n === 12 ||
                      n === 36
                    ) {
                      setHorizonMonths(n)
                    }
                  }}
                >
                  {HORIZONS.map((h) => (
                    <ToggleGroupItem
                      key={h}
                      value={String(h)}
                      aria-label={`Horizon ${HORIZON_LABELS[h]}`}
                      className="flex-1"
                    >
                      {HORIZON_LABELS[h]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-foreground">Scenario</Label>
                <ScenarioToggle value={scenario} onChange={setScenario} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="col-span-12 space-y-4 lg:col-span-7">
          {portfolio ? (
            <ImxCall portfolio={portfolio} loading={loading} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="imx-heading text-xl text-muted-foreground">
                  {workloadsReady ? 'Computing…' : 'loading workloads...'}
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            About this call: <span className="font-mono">ornn_http</span> means
            the recommendation used a live Ornn quote;{' '}
            <span className="font-mono">ornn_fixture</span> is the seeded market
            path we ship with the demo.
          </p>
        </section>
      </div>
    </main>
  )
}

function summarizeGpuTypes(workloads: Workload[]): string {
  if (workloads.length === 0) return 'portfolio'
  const seen = new Set<string>()
  for (const w of workloads) seen.add(w.gpuType)
  return `${[...seen].join(' · ')} · portfolio`
}
