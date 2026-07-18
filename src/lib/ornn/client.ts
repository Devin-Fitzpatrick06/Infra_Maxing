import { FixtureOrnnClient } from './fixtures'
import { HttpOrnnClient } from './http'
import type { Chip, CurveSnapshot, OrnnClient } from './types'

// Park the cached client on globalThis so it survives Next dev HMR — otherwise
// each request re-instantiates the module and re-probes the (unreachable)
// primary, spending ~12s per cold hit.
const globalCache = globalThis as unknown as {
  __ornnClient?: OrnnClient
}

// Returns a client that prefers HttpOrnnClient when ORNN_BASE_URL + key are
// set, but transparently falls back to the deterministic fixture on any
// network or shape error. This is what lets the demo run whether or not the
// real API is reachable (Zscaler, offline, etc.).
export function getOrnnClient(): OrnnClient {
  if (globalCache.__ornnClient) return globalCache.__ornnClient
  const apiKey = process.env.ORNN_API_KEY
  const baseUrl = process.env.ORNN_BASE_URL
  const authHeader = (process.env.ORNN_AUTH_HEADER ?? 'Authorization') as
    | 'Authorization'
    | 'x-api-key'

  const fixture = new FixtureOrnnClient()

  if (!apiKey || !baseUrl) {
    globalCache.__ornnClient = fixture
    return fixture
  }

  const http = new HttpOrnnClient({ baseUrl, apiKey, authHeader })
  const client = new FallbackOrnnClient(http, fixture)
  globalCache.__ornnClient = client
  return client
}

class FallbackOrnnClient implements OrnnClient {
  // Once the primary fails, don't hammer the unreachable host on every request.
  // A fresh dev server restart resets this and re-probes the real API.
  private primaryDead = false

  constructor(
    private readonly primary: OrnnClient,
    private readonly fallback: OrnnClient,
  ) {}

  async listChips(): Promise<Chip[]> {
    if (!this.primaryDead) {
      try {
        const chips = await this.primary.listChips()
        if (chips.length > 0) return chips
        this.primaryDead = true
      } catch {
        this.primaryDead = true
      }
    }
    return this.fallback.listChips()
  }

  async getForwardCurve(
    gpuType: string,
    horizonDays: number,
  ): Promise<CurveSnapshot> {
    if (!this.primaryDead) {
      try {
        return await this.primary.getForwardCurve(gpuType, horizonDays)
      } catch {
        this.primaryDead = true
      }
    }
    return this.fallback.getForwardCurve(gpuType, horizonDays)
  }
}
