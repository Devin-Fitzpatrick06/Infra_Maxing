// Selects the Datadog client implementation based on env. For the hackathon
// we ship the fixture only; the interface is stable so a HttpDatadogClient
// can slot in without changing callers.

import { FixtureDatadogClient } from './fixtures'
import type { DatadogClient } from './types'

let cached: DatadogClient | null = null

export function getDatadogClient(): DatadogClient {
  if (cached) return cached
  const mode = process.env.DATADOG_MODE ?? 'fixture'
  if (mode !== 'fixture') {
    // Placeholder — swap in a real HttpDatadogClient when we ship real Datadog.
    throw new Error(
      `DATADOG_MODE=${mode} but only 'fixture' is implemented right now`,
    )
  }
  cached = new FixtureDatadogClient()
  return cached
}
