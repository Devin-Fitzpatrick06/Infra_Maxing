import { NextResponse } from 'next/server'
import { getDatadogClient } from '@/lib/datadog/client'

// Non-caching by default for POST; belt-and-suspenders for the GET too since
// this route seeds Supabase on first call.
export const dynamic = 'force-dynamic'

// GET /api/datadog/workloads
// Returns the list of workloads. Response shape mirrors what a real Datadog
// discovery pipeline would surface: id, name, gpuType, archetype, tags.
export async function GET() {
  const dd = getDatadogClient()
  const workloads = await dd.listWorkloads()
  return NextResponse.json({ workloads })
}
