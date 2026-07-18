-- GPU Reservation Optimizer — initial schema
-- Five tables: workloads, usage_daily, curve_snapshots, decisions, backtests
-- All primary keys are uuid; timestamps are timestamptz.
-- No RLS enabled yet — single demo workspace for the hackathon.

create extension if not exists "uuid-ossp";

-- Workloads discovered (or seeded via fixture) from Datadog.
-- archetype: 'steady_inference' | 'bursty_training' | 'interactive_dev'
create table if not exists workloads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  gpu_type text not null,                    -- e.g. 'H100', 'A10G'
  archetype text not null,
  tags jsonb not null default '{}'::jsonb,   -- {workload, env, team, ...}
  created_at timestamptz not null default now()
);

create index if not exists workloads_gpu_type_idx on workloads (gpu_type);

-- Daily rollups per workload. Sourced from Datadog utilization + cost APIs
-- (real or fixture). provenance captures the exact query strings that
-- produced each row so the UI can show sources.
create table if not exists usage_daily (
  id uuid primary key default uuid_generate_v4(),
  workload_id uuid not null references workloads (id) on delete cascade,
  day date not null,
  gpu_hours numeric(14, 4) not null default 0,        -- total GPU-hours consumed
  on_demand_hours numeric(14, 4) not null default 0,  -- of which on-demand
  reserved_hours numeric(14, 4) not null default 0,   -- of which reservation-covered
  cost_usd numeric(14, 4) not null default 0,         -- total spend for the day
  provenance jsonb not null default '{}'::jsonb,      -- {utilization_query, cost_query, ...}
  created_at timestamptz not null default now(),
  unique (workload_id, day)
);

create index if not exists usage_daily_workload_day_idx
  on usage_daily (workload_id, day desc);

-- Snapshots of Ornn forward curves. Points are [{t, price_usd_per_hour}].
create table if not exists curve_snapshots (
  id uuid primary key default uuid_generate_v4(),
  gpu_type text not null,
  fetched_at timestamptz not null default now(),
  horizon_days integer not null,
  points jsonb not null,             -- [{"t":"2026-07-18","price_usd_per_hour":2.5}, ...]
  source text not null default 'ornn_http',  -- 'ornn_http' | 'ornn_fixture'
  raw_response jsonb                 -- raw API payload for provenance
);

create index if not exists curve_snapshots_gpu_type_fetched_idx
  on curve_snapshots (gpu_type, fetched_at desc);

-- Recommendations produced by the engine. Every /api/recommend call writes one.
-- recommendation is a structured object: {reservedPct, horizonMonths, gpuType, mix:[...]}
create table if not exists decisions (
  id uuid primary key default uuid_generate_v4(),
  workload_id uuid not null references workloads (id) on delete cascade,
  question text,                              -- optional natural-language framing
  inputs jsonb not null,                      -- the raw inputs the engine received
  recommendation jsonb not null,              -- engine output
  saving_estimate_usd numeric(14, 4) not null,
  confidence_low_usd numeric(14, 4) not null,
  confidence_high_usd numeric(14, 4) not null,
  rationale text not null,
  curve_snapshot_id uuid references curve_snapshots (id) on delete set null,
  datadog_queries jsonb not null default '[]'::jsonb,  -- provenance
  created_at timestamptz not null default now(),
  approved_by text,                           -- null until a human approves
  approved_at timestamptz,
  realized_delta_usd numeric(14, 4)           -- filled in over time
);

create index if not exists decisions_workload_created_idx
  on decisions (workload_id, created_at desc);

-- Backtest results. One row per /api/backtest call.
create table if not exists backtests (
  id uuid primary key default uuid_generate_v4(),
  workload_id uuid references workloads (id) on delete cascade,
  strategy jsonb not null,                    -- {reservedPct, horizonMonths, ...}
  window_start date not null,
  window_end date not null,
  cumulative_saving_usd numeric(14, 4) not null,
  hit_rate numeric(6, 4) not null,            -- fraction of decision points that beat baseline
  worst_month jsonb not null,                 -- {"month":"2025-11", "delta_usd": -123.45}
  monthly jsonb not null,                     -- [{month, baseline_usd, strategy_usd, delta_usd}]
  created_at timestamptz not null default now()
);

create index if not exists backtests_workload_created_idx
  on backtests (workload_id, created_at desc);
