'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface Workload {
  id: string
  name: string
  gpuType: string
  archetype: string
}

interface RecommendResponse {
  workload: { id: string; name: string; gpuType: string }
  recommendation: {
    reservedPct: number
    horizonMonths: number
    gpuType: string
    baselineCostUsd: number
    strategyCostUsd: number
    mix: Array<{ monthOffset: number; reservedHours: number; onDemandHours: number; costUsd: number }>
  }
  savingEstimateUsd: number
  confidence: { low: number; high: number }
  rationale: string
  breakEvenMonthOffset: number | null
  provenance: {
    ornn: { source: string; fetchedAt: string; horizonDays: number; pointCount: number }
    datadog: { from: string; to: string; queries: string[] }
    engine: { curvePointCount: number; usageDayCount: number; scenario: string; horizonMonths: number; reservedPct: number }
  }
}

const HORIZONS = [3, 6, 12, 36] as const
const SCENARIOS = ['market', 'bull', 'bear', 'flat'] as const

export default function SandboxPage() {
  const [workloads, setWorkloads] = useState<Workload[]>([])
  const [workloadId, setWorkloadId] = useState<string>('')
  const [reservedPct, setReservedPct] = useState(0.6)
  const [horizonMonths, setHorizonMonths] = useState<3 | 6 | 12 | 36>(6)
  const [usageBias, setUsageBias] = useState(0)
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>('market')
  const [result, setResult] = useState<RecommendResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/datadog/workloads')
      .then((r) => r.json())
      .then((j: { workloads: Workload[] }) => {
        setWorkloads(j.workloads)
        if (j.workloads[0]) setWorkloadId(j.workloads[0].id)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const workload = useMemo(
    () => workloads.find((w) => w.id === workloadId) ?? null,
    [workloads, workloadId],
  )

  useEffect(() => {
    if (!workloadId || !workload) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      fetch('/api/recommend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workloadId,
          inputs: {
            reservedPct,
            horizonMonths,
            usageBias,
            scenario,
            gpuType: workload.gpuType,
          },
        }),
      })
        .then(async (r) => {
          const j = await r.json()
          if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
          setResult(j as RecommendResponse)
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false))
    }, 150)
  }, [workloadId, reservedPct, horizonMonths, usageBias, scenario, workload])

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Scenario sandbox</h1>
        <p className="text-muted-foreground text-sm">
          Stub layout — one live slider, other controls wired but styling minimal. The real sandbox is coming.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-3 rounded-lg border p-4 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Workload</label>
            <select
              className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
              value={workloadId}
              onChange={(e) => setWorkloadId(e.target.value)}
            >
              {workloads.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.gpuType} · {w.archetype})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              % steady-load reserved: <span className="font-mono">{(reservedPct * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(reservedPct * 100)}
              onChange={(e) => setReservedPct(Number(e.target.value) / 100)}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Horizon (months)</label>
            <div className="mt-2 flex gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizonMonths(h)}
                  className={`rounded border px-3 py-1 text-sm ${
                    horizonMonths === h ? 'bg-foreground text-background' : ''
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Usage bias: <span className="font-mono">{(usageBias * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min={-25}
              max={25}
              value={Math.round(usageBias * 100)}
              onChange={(e) => setUsageBias(Number(e.target.value) / 100)}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Scenario</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`rounded border px-3 py-1 text-sm capitalize ${
                    scenario === s ? 'bg-foreground text-background' : ''
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-6 rounded-lg border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Projection</div>
          {result ? (
            <MixChart mix={result.recommendation.mix} />
          ) : (
            <div className="mt-4 h-64 rounded border-dashed border grid place-items-center text-muted-foreground text-sm">
              (chart placeholder — real chart coming in the sandbox phase)
            </div>
          )}
          <pre className="mt-4 max-h-56 overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
            {result ? JSON.stringify(result.recommendation.mix, null, 2) : 'loading…'}
          </pre>
        </section>

        <aside className="col-span-12 lg:col-span-3 rounded-lg border p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</div>
          {error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : !result ? (
            <div className="text-sm text-muted-foreground">
              {loading ? 'computing…' : 'waiting for inputs…'}
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs text-muted-foreground">Projected saving</div>
                <div className="text-2xl font-semibold">
                  ${result.savingEstimateUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  band ${result.confidence.low.toLocaleString(undefined, { maximumFractionDigits: 0 })} –
                  ${' '}
                  ${result.confidence.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Break-even month</div>
                <div className="text-sm">
                  {result.breakEvenMonthOffset === null
                    ? 'never in horizon'
                    : `month ${result.breakEvenMonthOffset + 1}`}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">Rationale</div>
                <p className="text-xs leading-relaxed">{result.rationale}</p>
              </div>
              <button
                disabled
                title="Adopt scenario — wired in the real sandbox phase"
                className="mt-2 w-full rounded border px-3 py-2 text-sm opacity-50"
              >
                Adopt this scenario
              </button>
            </>
          )}
        </aside>

        <section className="col-span-12 rounded-lg border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Evidence
          </div>
          {result ? (
            <ul className="text-[11px] font-mono grid gap-1 md:grid-cols-2">
              <li>Ornn source: {result.provenance.ornn.source}</li>
              <li>Ornn fetchedAt: {result.provenance.ornn.fetchedAt}</li>
              <li>Ornn horizonDays: {result.provenance.ornn.horizonDays}</li>
              <li>Ornn pointCount: {result.provenance.ornn.pointCount}</li>
              <li>Datadog window: {result.provenance.datadog.from} → {result.provenance.datadog.to}</li>
              <li>Engine scenario: {result.provenance.engine.scenario}</li>
              {result.provenance.datadog.queries.map((q, i) => (
                <li key={i} className="col-span-2 truncate">DD: {q}</li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground text-xs">(nothing yet)</div>
          )}
        </section>
      </div>
    </main>
  )
}

function MixChart({
  mix,
}: {
  mix: Array<{ monthOffset: number; reservedHours: number; onDemandHours: number; costUsd: number }>
}) {
  const max = Math.max(...mix.map((m) => m.costUsd), 1)
  return (
    <div className="mt-4 flex h-64 items-end gap-1 rounded border p-2">
      {mix.map((m) => {
        const h = (m.costUsd / max) * 100
        return (
          <div key={m.monthOffset} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-foreground"
              style={{ height: `${h}%` }}
              title={`M${m.monthOffset + 1}: $${m.costUsd.toFixed(0)}`}
            />
            <div className="text-[9px] text-muted-foreground">
              M{m.monthOffset + 1}
            </div>
          </div>
        )
      })}
    </div>
  )
}
