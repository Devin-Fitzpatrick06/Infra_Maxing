// Real HTTP client for the Ornn API. The exact endpoint shapes will be
// finalized during the B1 discovery spike; this module is written defensively
// so it accepts several plausible response shapes and normalizes them into
// our internal CurveSnapshot type.
//
// Set ORNN_BASE_URL + ORNN_API_KEY in .env.local. Auth defaults to Bearer;
// override with ORNN_AUTH_HEADER=x-api-key if the API uses that pattern.

import type { Chip, CurvePoint, CurveSnapshot, OrnnClient } from './types'

interface HttpOrnnOptions {
  baseUrl: string
  apiKey: string
  authHeader?: 'Authorization' | 'x-api-key'
  timeoutMs?: number
}

// Per-attempt fetch timeout. Kept small because we try several candidate paths
// on every call — if the host is unreachable (Zscaler, offline) we bail fast
// and let the fixture fallback take over.
const DEFAULT_TIMEOUT_MS = 2500

interface UnknownCurveResponse {
  points?: Array<{
    t?: string
    date?: string
    timestamp?: string | number
    price?: number
    price_usd_per_hour?: number
    value?: number
  }>
  data?: unknown
  curve?: unknown
  [k: string]: unknown
}

export class HttpOrnnClient implements OrnnClient {
  constructor(private readonly opts: HttpOrnnOptions) {}

  private async fetchWithTimeout(url: URL): Promise<Response> {
    const timeoutMs = this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, {
        headers: this.headers(),
        cache: 'no-store',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { accept: 'application/json' }
    const which = this.opts.authHeader ?? 'Authorization'
    if (which === 'Authorization') {
      h.Authorization = `Bearer ${this.opts.apiKey}`
    } else {
      h['x-api-key'] = this.opts.apiKey
    }
    return h
  }

  async listChips(): Promise<Chip[]> {
    // Best-effort — several endpoint spellings are attempted. The endpoints
    // will be locked in after the discovery spike.
    const candidates = ['/chips', '/instruments', '/gpus', '/v1/chips']
    for (const path of candidates) {
      try {
        const res = await this.fetchWithTimeout(new URL(path, this.opts.baseUrl))
        if (!res.ok) continue
        const json = (await res.json()) as unknown
        const chips = normalizeChips(json)
        if (chips.length > 0) return chips
      } catch {
        // fall through
      }
    }
    return []
  }

  async getForwardCurve(
    gpuType: string,
    horizonDays: number,
  ): Promise<CurveSnapshot> {
    // Try a small list of plausible endpoint shapes; the discovery spike will
    // narrow this down.
    const params = new URLSearchParams({
      gpu_type: gpuType,
      instrument: gpuType,
      chip: gpuType,
      horizon_days: String(horizonDays),
    })
    const candidates = [
      `/v1/forward-curve?${params}`,
      `/v1/curves/forward?${params}`,
      `/forward-curve?${params}`,
      `/curves/forward?${params}`,
      `/gpu/forward-curve?${params}`,
    ]
    for (const path of candidates) {
      try {
        const res = await this.fetchWithTimeout(new URL(path, this.opts.baseUrl))
        if (!res.ok) continue
        const json = (await res.json()) as UnknownCurveResponse
        const points = normalizeCurve(json)
        if (points.length > 0) {
          return {
            gpuType,
            fetchedAt: new Date().toISOString(),
            horizonDays,
            points,
            source: 'ornn_http',
            rawResponse: json,
          }
        }
      } catch {
        // try next
      }
    }
    throw new Error(
      `Ornn HTTP: no candidate endpoint returned a usable curve for ${gpuType}`,
    )
  }
}

function normalizeChips(json: unknown): Chip[] {
  if (Array.isArray(json)) {
    return json
      .map((item) => {
        if (typeof item === 'string') return { gpuType: item, displayName: item }
        const obj = item as Record<string, unknown>
        const gpuType =
          (obj.gpu_type as string) ||
          (obj.gpuType as string) ||
          (obj.symbol as string) ||
          (obj.name as string) ||
          (obj.id as string) ||
          ''
        if (!gpuType) return null
        return {
          gpuType,
          displayName:
            (obj.display_name as string) ||
            (obj.displayName as string) ||
            (obj.name as string) ||
            gpuType,
        }
      })
      .filter((c): c is Chip => c !== null)
  }
  const wrapped = (json as { data?: unknown }).data
  if (wrapped) return normalizeChips(wrapped)
  return []
}

function normalizeCurve(json: UnknownCurveResponse): CurvePoint[] {
  const rawPoints = extractPoints(json)
  return rawPoints
    .map((p) => {
      const t =
        (p.t as string) ||
        (p.date as string) ||
        (typeof p.timestamp === 'number'
          ? new Date(p.timestamp).toISOString().slice(0, 10)
          : (p.timestamp as string)) ||
        ''
      const price =
        (typeof p.price_usd_per_hour === 'number' ? p.price_usd_per_hour : undefined) ??
        (typeof p.price === 'number' ? p.price : undefined) ??
        (typeof p.value === 'number' ? p.value : undefined)
      if (!t || price === undefined) return null
      return { t: t.slice(0, 10), price_usd_per_hour: price }
    })
    .filter((p): p is CurvePoint => p !== null)
}

function extractPoints(
  json: UnknownCurveResponse,
): NonNullable<UnknownCurveResponse['points']> {
  if (Array.isArray(json.points)) return json.points
  if (Array.isArray(json.curve)) {
    return json.curve as NonNullable<UnknownCurveResponse['points']>
  }
  if (Array.isArray(json.data)) {
    return json.data as NonNullable<UnknownCurveResponse['points']>
  }
  const dataObj = json.data as { points?: unknown } | undefined
  if (dataObj && Array.isArray(dataObj.points)) {
    return dataObj.points as NonNullable<UnknownCurveResponse['points']>
  }
  return []
}
