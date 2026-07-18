// Deterministic Datadog fixture. Three workload archetypes, 12 months of
// daily series each. Response shapes match Datadog's public API closely
// enough that a real HttpDatadogClient could replace this without touching
// downstream code.

import { clamp, hashSeed, mulberry32, normal } from '@/lib/rand'
import type {
  DatadogClient,
  DatadogSeries,
  DatadogUsageSeries,
  DatadogWorkload,
} from './types'

const MS_PER_DAY = 86_400_000

const WORKLOADS: DatadogWorkload[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'inference-prod-h100',
    gpuType: 'H100',
    archetype: 'steady_inference',
    tags: {
      workload: 'inference-prod',
      env: 'prod',
      team: 'ml-serving',
      gpu_type: 'H100',
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'training-experiments-h100',
    gpuType: 'H100',
    archetype: 'bursty_training',
    tags: {
      workload: 'training-experiments',
      env: 'research',
      team: 'ml-research',
      gpu_type: 'H100',
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'dev-notebooks-a10g',
    gpuType: 'A10G',
    archetype: 'interactive_dev',
    tags: {
      workload: 'dev-notebooks',
      env: 'dev',
      team: 'platform',
      gpu_type: 'A10G',
    },
  },
]

// Anchor prices per chip. These are the "market rate" the fixture prices
// against; they drift over time to mimic a real market.
const ANCHOR_PRICE_USD_PER_HOUR: Record<string, number> = {
  H100: 2.6,
  A10G: 0.9,
}

// Base capacity per archetype (GPU-hours available per day, before demand shape).
const BASE_CAPACITY: Record<DatadogWorkload['archetype'], number> = {
  steady_inference: 400,   // ~16-17 H100s pinned
  bursty_training: 800,    // higher ceiling, bursty
  interactive_dev: 120,    // small, bursty in-hours
}

// Reserved-hours mix baked into the fixture — what the customer *already* has
// reserved. Engine will treat this as current posture.
const RESERVED_FRACTION: Record<DatadogWorkload['archetype'], number> = {
  steady_inference: 0.55,
  bursty_training: 0.15,
  interactive_dev: 0.0,
}

function dateKey(msUTC: number): string {
  return new Date(msUTC).toISOString().slice(0, 10)
}

function toMidnightUTC(iso: string): number {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  )
}

// Shape usage across the window per archetype. Returns fraction of BASE_CAPACITY
// on that day (before noise).
function demandShape(
  archetype: DatadogWorkload['archetype'],
  dayIndex: number,
  totalDays: number,
): number {
  const dow = new Date(dayIndex * MS_PER_DAY).getUTCDay()
  const isWeekend = dow === 0 || dow === 6
  const seasonal = Math.sin((2 * Math.PI * dayIndex) / 365) // annual cycle
  const trend = dayIndex / totalDays // slight growth into the future

  switch (archetype) {
    case 'steady_inference': {
      // High baseline, weekday bump, mild seasonal drift, slight growth.
      const weekday = isWeekend ? 0.9 : 1.0
      return clamp(0.7 + 0.08 * seasonal + 0.05 * trend, 0.4, 1.1) * weekday
    }
    case 'bursty_training': {
      // Sawtooth-y — long runs punctuated by quiet periods. Use a
      // deterministic square-ish wave off dayIndex.
      const burstCycle = Math.sin((2 * Math.PI * dayIndex) / 14) // 2-week cycle
      const burst = burstCycle > 0.3 ? 1.0 : 0.15
      return clamp(burst + 0.05 * seasonal, 0.05, 1.2)
    }
    case 'interactive_dev': {
      // Weekday-only, spiky at start/end of day (but we aggregate daily).
      return isWeekend ? 0.05 : clamp(0.35 + 0.1 * seasonal, 0.1, 0.8)
    }
  }
}

// Price trajectory per chip over the window. Mildly upward-drifting with
// mean-reverting noise. Returns $/GPU-hour.
function pricePath(gpuType: string, dayIndex: number, seed: number): number {
  const anchor = ANCHOR_PRICE_USD_PER_HOUR[gpuType] ?? 2.0
  const rng = mulberry32((seed ^ dayIndex ^ hashSeed(gpuType)) >>> 0)
  const trend = 1 + (dayIndex / 3650) // ~10% over 10y drift
  const seasonal = 1 + 0.04 * Math.sin((2 * Math.PI * dayIndex) / 180)
  const noise = 1 + 0.03 * normal(rng)
  return anchor * trend * seasonal * noise
}

function buildUsageSeries(
  workload: DatadogWorkload,
  fromISO: string,
  toISO: string,
): DatadogUsageSeries {
  const fromDay = Math.floor(toMidnightUTC(fromISO) / MS_PER_DAY)
  const toDay = Math.floor(toMidnightUTC(toISO) / MS_PER_DAY)
  if (toDay < fromDay) {
    return emptySeries(workload, fromISO, toISO)
  }
  const totalDays = toDay - fromDay + 1
  const baseSeed = hashSeed(workload.id)
  const rng = mulberry32(baseSeed)

  const utilizationPoints: Array<[number, number]> = []
  const gpuHoursPoints: Array<[number, number]> = []
  const onDemandPoints: Array<[number, number]> = []
  const reservedPoints: Array<[number, number]> = []
  const costPoints: Array<[number, number]> = []

  const capacity = BASE_CAPACITY[workload.archetype]
  const reservedFrac = RESERVED_FRACTION[workload.archetype]

  for (let d = fromDay; d <= toDay; d++) {
    const shape = demandShape(workload.archetype, d, totalDays + fromDay)
    const noise = 1 + 0.08 * normal(rng)
    const gpuHours = clamp(capacity * shape * noise, 0, capacity * 1.2)

    // Reservation covers up to reservedFrac * capacity; rest is on-demand.
    const reservationCapacity = reservedFrac * capacity
    const reservedHours = Math.min(gpuHours, reservationCapacity)
    const onDemandHours = gpuHours - reservedHours

    const marketPrice = pricePath(workload.gpuType, d, baseSeed)
    // Reservations get ~35% discount vs the spot market.
    const reservationPrice = marketPrice * 0.65
    const costUsd = reservedHours * reservationPrice + onDemandHours * marketPrice

    const utilization = clamp(gpuHours / capacity, 0, 1)

    const tsMs = d * MS_PER_DAY
    utilizationPoints.push([tsMs, Number(utilization.toFixed(4))])
    gpuHoursPoints.push([tsMs, Number(gpuHours.toFixed(2))])
    onDemandPoints.push([tsMs, Number(onDemandHours.toFixed(2))])
    reservedPoints.push([tsMs, Number(reservedHours.toFixed(2))])
    costPoints.push([tsMs, Number(costUsd.toFixed(2))])
  }

  const commonTags = Object.entries(workload.tags)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  const utilQuery = `avg:dcgm.gpu.util{${commonTags}} by {host}`
  const hoursQuery = `sum:system.gpu.hours{${commonTags}}.rollup(sum, 86400)`
  const onDemandQuery = `sum:aws.compute.gpu_hours{${commonTags},pricing:ondemand}.rollup(sum, 86400)`
  const reservedQuery = `sum:aws.compute.gpu_hours{${commonTags},pricing:reserved}.rollup(sum, 86400)`
  const costQuery = `sum:aws.cost.amortized{service:ec2,${commonTags}}.rollup(sum, 86400)`

  return {
    workloadId: workload.id,
    from: fromISO,
    to: toISO,
    gpuUtilization: mkSeries(utilQuery, 'percent', utilizationPoints),
    gpuHours: mkSeries(hoursQuery, 'gpu_hour', gpuHoursPoints),
    onDemandHours: mkSeries(onDemandQuery, 'gpu_hour', onDemandPoints),
    reservedHours: mkSeries(reservedQuery, 'gpu_hour', reservedPoints),
    costUsd: mkSeries(costQuery, 'usd', costPoints),
  }
}

function emptySeries(
  workload: DatadogWorkload,
  fromISO: string,
  toISO: string,
): DatadogUsageSeries {
  const mk = (q: string, u: string) => mkSeries(q, u, [])
  return {
    workloadId: workload.id,
    from: fromISO,
    to: toISO,
    gpuUtilization: mk('empty', 'percent'),
    gpuHours: mk('empty', 'gpu_hour'),
    onDemandHours: mk('empty', 'gpu_hour'),
    reservedHours: mk('empty', 'gpu_hour'),
    costUsd: mk('empty', 'usd'),
  }
}

function mkSeries(
  query: string,
  unit: string,
  pointlist: Array<[number, number]>,
): DatadogSeries {
  return { query, unit, pointlist }
}

export class FixtureDatadogClient implements DatadogClient {
  async listWorkloads(): Promise<DatadogWorkload[]> {
    return WORKLOADS.map((w) => ({ ...w, tags: { ...w.tags } }))
  }

  async getUsageSeries(
    workloadId: string,
    fromISO: string,
    toISO: string,
  ): Promise<DatadogUsageSeries> {
    const workload = WORKLOADS.find((w) => w.id === workloadId)
    if (!workload) {
      throw new Error(`Unknown workload: ${workloadId}`)
    }
    return buildUsageSeries(workload, fromISO, toISO)
  }
}

// Small helper for iterating a DatadogUsageSeries into daily rows.
export function toDailyRows(series: DatadogUsageSeries): Array<{
  day: string
  gpuHours: number
  onDemandHours: number
  reservedHours: number
  costUsd: number
  provenance: { utilization_query: string; cost_query: string }
}> {
  const days = series.gpuHours.pointlist.length
  const rows: Array<{
    day: string
    gpuHours: number
    onDemandHours: number
    reservedHours: number
    costUsd: number
    provenance: { utilization_query: string; cost_query: string }
  }> = []
  for (let i = 0; i < days; i++) {
    const [ts, gpuHours] = series.gpuHours.pointlist[i]
    rows.push({
      day: dateKey(ts),
      gpuHours,
      onDemandHours: series.onDemandHours.pointlist[i]?.[1] ?? 0,
      reservedHours: series.reservedHours.pointlist[i]?.[1] ?? 0,
      costUsd: series.costUsd.pointlist[i]?.[1] ?? 0,
      provenance: {
        utilization_query: series.gpuUtilization.query,
        cost_query: series.costUsd.query,
      },
    })
  }
  return rows
}
