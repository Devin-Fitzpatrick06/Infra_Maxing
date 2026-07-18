import { FixtureOrnnClient } from './fixtures'
import { HttpOrnnClient } from './http'
import type {
  Chip,
  CurveSnapshot,
  OrnnClient,
  SpotHistorySnapshot,
} from './types'

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

const PRIMARY_RETRY_MS = 60_000

class FallbackOrnnClient implements OrnnClient {
  // Once the primary fails, don't hammer the unreachable host on every request.
  // We record the timestamp of the failure and re-probe after PRIMARY_RETRY_MS
  // so transient network hiccups heal automatically.
  private primaryDeadUntil = 0

  constructor(
    private readonly primary: OrnnClient,
    private readonly fallback: OrnnClient,
  ) {}

  private primaryReady(): boolean {
    return Date.now() >= this.primaryDeadUntil
  }

  private markPrimaryDead(): void {
    this.primaryDeadUntil = Date.now() + PRIMARY_RETRY_MS
  }

  async listChips(): Promise<Chip[]> {
    if (this.primaryReady()) {
      try {
        const chips = await this.primary.listChips()
        if (chips.length > 0) return chips
        this.markPrimaryDead()
      } catch {
        this.markPrimaryDead()
      }
    }
    return this.fallback.listChips()
  }

  async getForwardCurve(
    gpuType: string,
    horizonDays: number,
  ): Promise<CurveSnapshot> {
    if (this.primaryReady()) {
      try {
        return await this.primary.getForwardCurve(gpuType, horizonDays)
      } catch {
        this.markPrimaryDead()
      }
    }
    return this.fallback.getForwardCurve(gpuType, horizonDays)
  }

  async getSpotHistory(
    gpuType: string,
    days: number,
  ): Promise<SpotHistorySnapshot> {
    if (this.primaryReady()) {
      try {
        return await this.primary.getSpotHistory(gpuType, days)
      } catch {
        // Spot history is the most-likely-missing endpoint; if it 404s the
        // forward endpoint may still be fine. Don't kill the whole primary.
      }
    }
    return this.fallback.getSpotHistory(gpuType, days)
  }
}
