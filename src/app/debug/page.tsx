import { absoluteUrl } from '@/lib/base-url'

export const dynamic = 'force-dynamic'

async function safeFetch(path: string, init?: RequestInit): Promise<unknown> {
  try {
    const url = await absoluteUrl(path)
    const res = await fetch(url, { cache: 'no-store', ...init })
    const text = await res.text()
    try {
      return { status: res.status, body: JSON.parse(text) }
    } catch {
      return { status: res.status, body: text }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export default async function DebugPage() {
  const [workloadsResp, curveResp] = await Promise.all([
    safeFetch('/api/datadog/workloads'),
    safeFetch('/api/ornn/curve?gpuType=H100&horizonDays=180'),
  ])

  // Pull first workload id from the workloads response for downstream calls.
  const workloadsBody = (workloadsResp as { body?: { workloads?: Array<{ id: string; gpuType: string }> } })
    .body
  const firstWorkload = workloadsBody?.workloads?.[0]
  const workloadId = firstWorkload?.id ?? ''
  const gpuType = firstWorkload?.gpuType ?? 'H100'

  const usageResp = workloadId
    ? await safeFetch(
        `/api/datadog/usage?workloadId=${workloadId}&from=${daysAgoISO(120)}&to=${todayISO()}`,
      )
    : { skipped: 'no workload' }

  const recommendResp = workloadId
    ? await safeFetch('/api/recommend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workloadId,
          question: 'Should we reserve steady load for the next 6 months?',
          inputs: {
            reservedPct: 0.6,
            horizonMonths: 6,
            usageBias: 0,
            scenario: 'market',
            gpuType,
          },
        }),
      })
    : { skipped: 'no workload' }

  const backtestResp = workloadId
    ? await safeFetch('/api/backtest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workloadId,
          strategy: {
            reservedPct: 0.6,
            horizonMonths: 6,
            scenario: 'market',
            usageBias: 0,
          },
        }),
      })
    : { skipped: 'no workload' }

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Debug</h1>
        <p className="text-muted-foreground text-sm">
          Raw JSON from every backend API route. Refresh to re-run.
        </p>
      </header>

      <Block title="GET /api/datadog/workloads" data={workloadsResp} />
      <Block title="GET /api/ornn/curve?gpuType=H100&horizonDays=180" data={curveResp} />
      <Block title="GET /api/datadog/usage (last 120d, first workload)" data={usageResp} />
      <Block
        title="POST /api/recommend (60% reserved, 6mo, market scenario)"
        data={recommendResp}
      />
      <Block
        title="POST /api/backtest (same strategy, 12mo window default)"
        data={backtestResp}
      />
    </main>
  )
}

function Block({ title, data }: { title: string; data: unknown }) {
  return (
    <section className="rounded-lg border bg-card text-card-foreground">
      <div className="border-b px-4 py-2 font-medium text-sm">{title}</div>
      <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  )
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}
