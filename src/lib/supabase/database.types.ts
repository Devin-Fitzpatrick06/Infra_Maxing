// Hand-authored types for the GPU Reservation Optimizer schema.
// Mirrors supabase/migrations/0001_init.sql. Regenerate via
// `supabase gen types typescript` once we have a project linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkloadArchetype =
  | 'steady_inference'
  | 'bursty_training'
  | 'interactive_dev'

export interface CurvePoint {
  t: string // ISO date, e.g. '2026-07-18'
  price_usd_per_hour: number
}

export interface Provenance {
  utilization_query?: string
  cost_query?: string
  [k: string]: unknown
}

// Engine / recommendation runtime shapes.

export type CurveScenario = 'market' | 'bull' | 'bear' | 'flat'

export interface RecommendInputs {
  reservedPct: number // 0..1
  horizonMonths: 3 | 6 | 12 | 36
  usageBias: number // -0.25..0.25
  scenario: CurveScenario
  gpuType: string
}

export interface RecommendedMixRow {
  monthOffset: number
  reservedHours: number
  onDemandHours: number
  costUsd: number
}

export interface Recommendation {
  reservedPct: number
  horizonMonths: number
  gpuType: string
  mix: RecommendedMixRow[]
  baselineCostUsd: number
  strategyCostUsd: number
}

export interface BacktestStrategy {
  reservedPct: number
  horizonMonths: number
  scenario: CurveScenario
  usageBias: number
}

export interface BacktestMonthly {
  month: string
  baseline_usd: number
  strategy_usd: number
  delta_usd: number
}

// Supabase Database type. Every table has `Relationships: []` to satisfy
// postgrest-js's GenericTable constraint. Views / Functions are declared
// empty; Enums is omitted from postgrest-js's GenericSchema so we skip it.

export interface Database {
  public: {
    Tables: {
      workloads: {
        Row: {
          id: string
          name: string
          gpu_type: string
          archetype: WorkloadArchetype
          tags: Record<string, string>
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          gpu_type: string
          archetype: WorkloadArchetype
          tags?: Record<string, string>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workloads']['Insert']>
        Relationships: []
      }
      usage_daily: {
        Row: {
          id: string
          workload_id: string
          day: string
          gpu_hours: number
          on_demand_hours: number
          reserved_hours: number
          cost_usd: number
          provenance: Provenance
          created_at: string
        }
        Insert: {
          id?: string
          workload_id: string
          day: string
          gpu_hours?: number
          on_demand_hours?: number
          reserved_hours?: number
          cost_usd?: number
          provenance?: Provenance
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['usage_daily']['Insert']>
        Relationships: []
      }
      curve_snapshots: {
        Row: {
          id: string
          gpu_type: string
          fetched_at: string
          horizon_days: number
          points: CurvePoint[]
          source: 'ornn_http' | 'ornn_fixture'
          raw_response: Json | null
        }
        Insert: {
          id?: string
          gpu_type: string
          fetched_at?: string
          horizon_days: number
          points: CurvePoint[]
          source?: 'ornn_http' | 'ornn_fixture'
          raw_response?: Json | null
        }
        Update: Partial<Database['public']['Tables']['curve_snapshots']['Insert']>
        Relationships: []
      }
      decisions: {
        Row: {
          id: string
          workload_id: string
          question: string | null
          inputs: RecommendInputs
          recommendation: Recommendation
          saving_estimate_usd: number
          confidence_low_usd: number
          confidence_high_usd: number
          rationale: string
          curve_snapshot_id: string | null
          datadog_queries: string[]
          created_at: string
          approved_by: string | null
          approved_at: string | null
          realized_delta_usd: number | null
        }
        Insert: {
          id?: string
          workload_id: string
          question?: string | null
          inputs: RecommendInputs
          recommendation: Recommendation
          saving_estimate_usd: number
          confidence_low_usd: number
          confidence_high_usd: number
          rationale: string
          curve_snapshot_id?: string | null
          datadog_queries?: string[]
          created_at?: string
          approved_by?: string | null
          approved_at?: string | null
          realized_delta_usd?: number | null
        }
        Update: Partial<Database['public']['Tables']['decisions']['Insert']>
        Relationships: []
      }
      backtests: {
        Row: {
          id: string
          workload_id: string | null
          strategy: BacktestStrategy
          window_start: string
          window_end: string
          cumulative_saving_usd: number
          hit_rate: number
          worst_month: { month: string; delta_usd: number }
          monthly: BacktestMonthly[]
          created_at: string
        }
        Insert: {
          id?: string
          workload_id?: string | null
          strategy: BacktestStrategy
          window_start: string
          window_end: string
          cumulative_saving_usd: number
          hit_rate: number
          worst_month: { month: string; delta_usd: number }
          monthly: BacktestMonthly[]
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['backtests']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
