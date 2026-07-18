'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PortfolioInputs,
  PortfolioOutput,
} from '@/lib/engine/portfolio'
import {
  BackButton,
  Glossary,
  LiveBadge,
  NavBar,
  WidgetCard,
} from '@/components/imx/widget'
import { SliderRow } from '@/components/imx/slider-row'
import { WorkloadSelect } from '@/components/imx/workload-select'
import { ScenarioToggle } from '@/components/imx/scenario-toggle'
import { ImxCall } from '@/components/imx/imx-call'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

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
      .then((j: { workloads: Workload[] } | Workload[]) => {
        if (cancelled) return
        const list = Array.isArray(j) ? j : j.workloads
        setWorkloads(list)
        setSelectedIds(list.map((w) => w.id))
      })
      .catch((e) => console.error('failed to load workloads', e))
    return () => {
      cancelled = true
    }
  }, [])

  const fetchPortfolio = useCallback((inputs: PortfolioInputs) => {
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
  }, [])

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

  const workloadsReady = workloads.length > 0
  const liveSource: 'ORNN LIVE' = 'ORNN LIVE'

  return (
    <main className="imx-grid min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-3 flex items-center gap-2">
          <BackButton />
          <BackButton href="/forward" label="Back to Forward" />
        </div>
        <div className="mb-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="imx-heading imx-gradient-text text-2xl">
              Sandbox
            </h1>
            <span className="text-sm text-muted-foreground">
              Perturb inputs. Watch the optimal call move in real time.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LiveBadge source={liveSource} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <WidgetCard
              label="WORKLOADS"
              size="md"
              action={
                <span className="text-xs text-muted-foreground">
                  {selectedIds.length}/{workloads.length}
                </span>
              }
            >
              {workloadsReady ? (
                <WorkloadSelect
                  workloads={workloads}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Loading workloads...
                </div>
              )}
            </WidgetCard>

            <WidgetCard label="INPUTS" size="md">
              <div className="flex flex-col gap-5">
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

                <div>
                  <div className="imx-mono-label mb-1.5">HORIZON</div>
                  <ToggleGroup
                    className="w-full"
                    size="sm"
                    variant="outline"
                    orientation="horizontal"
                    value={[String(horizonMonths)]}
                    onValueChange={(next) => {
                      const picked = next[0]
                      const n = Number(picked)
                      if (n === 3 || n === 6 || n === 12 || n === 36) {
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

                <div>
                  <div className="imx-mono-label mb-1.5">SCENARIO</div>
                  <ScenarioToggle value={scenario} onChange={setScenario} />
                </div>
              </div>
            </WidgetCard>
          </section>

          <section className="col-span-12 lg:col-span-8">
            {portfolio ? (
              <ImxCall portfolio={portfolio} loading={loading} />
            ) : (
              <WidgetCard glow label="INFRA-MAXXER'S CALL">
                <div className="p-6 text-muted-foreground">
                  {workloadsReady ? 'Computing...' : 'Loading workloads...'}
                </div>
              </WidgetCard>
            )}

            <Glossary className="mt-4" title="HOW TO READ THIS" />

            <WidgetCard label="PROVENANCE" size="sm" className="mt-4">
              <p className="text-xs text-muted-foreground">
                This call blends live Ornn forward-curve quotes with your
                fleet&apos;s trailing usage. Every input change re-runs the
                optimizer end-to-end.
              </p>
            </WidgetCard>
          </section>
        </div>
      </div>
    </main>
  )
}
