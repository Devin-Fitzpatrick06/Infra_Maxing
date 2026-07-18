// Shapes that mirror Datadog's public API contracts closely enough that a
// real HttpDatadogClient could return the same objects unchanged.

import type { WorkloadArchetype } from '@/lib/supabase/database.types'

export interface DatadogWorkload {
  id: string
  name: string
  gpuType: string
  archetype: WorkloadArchetype
  tags: Record<string, string>
}

// Mirrors Datadog /api/v2/metrics/query response `data.attributes.series`.
// Each series has a pointlist of [timestamp_ms, value] tuples.
export interface DatadogSeries {
  query: string
  unit: string
  pointlist: Array<[number, number]>
}

export interface DatadogUsageSeries {
  workloadId: string
  from: string // ISO date
  to: string   // ISO date
  gpuUtilization: DatadogSeries      // 0..1 avg per day
  gpuHours: DatadogSeries            // total GPU-hours per day
  onDemandHours: DatadogSeries       // on-demand slice
  reservedHours: DatadogSeries       // reservation-covered slice
  costUsd: DatadogSeries             // daily cost from Cloud Cost Management
}

// Response shape of /api/datadog/usage (our own aggregation route)
export interface DailyUsageRow {
  day: string // ISO date
  gpuHours: number
  onDemandHours: number
  reservedHours: number
  costUsd: number
  provenance: {
    utilization_query: string
    cost_query: string
  }
}

export interface DatadogClient {
  listWorkloads(): Promise<DatadogWorkload[]>
  getUsageSeries(
    workloadId: string,
    fromISO: string,
    toISO: string,
  ): Promise<DatadogUsageSeries>
}
