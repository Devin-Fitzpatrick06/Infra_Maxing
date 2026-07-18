import type { CurvePoint } from '@/lib/supabase/database.types'

export type { CurvePoint }

export interface Chip {
  gpuType: string
  displayName: string
}

export interface CurveSnapshot {
  gpuType: string
  fetchedAt: string // ISO
  horizonDays: number
  points: CurvePoint[]
  source: 'ornn_http' | 'ornn_fixture'
  rawResponse?: unknown
}

export interface OrnnClient {
  listChips(): Promise<Chip[]>
  getForwardCurve(gpuType: string, horizonDays: number): Promise<CurveSnapshot>
}
