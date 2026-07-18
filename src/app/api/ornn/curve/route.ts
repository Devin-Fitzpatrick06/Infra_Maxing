import { NextRequest, NextResponse } from 'next/server'
import { getOrnnClient } from '@/lib/ornn/client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/ornn/curve?gpuType=H100&horizonDays=180
// Fetches the Ornn forward curve (real if ORNN_BASE_URL is set, otherwise
// fixture), persists a snapshot, and returns it.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gpuType = searchParams.get('gpuType') ?? 'H100'
  const horizonDays = Math.min(
    Math.max(Number(searchParams.get('horizonDays') ?? 180), 1),
    720,
  )

  const client = getOrnnClient()
  let snapshot
  try {
    snapshot = await client.getForwardCurve(gpuType, horizonDays)
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Ornn fetch failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }

  // Best-effort persistence. Skips silently if Supabase env isn't wired yet —
  // we still want the API to return curve data for the demo.
  try {
    const supabase = await createClient()
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const { data, error } = await supabase
        .from('curve_snapshots')
        .insert({
          gpu_type: snapshot.gpuType,
          fetched_at: snapshot.fetchedAt,
          horizon_days: snapshot.horizonDays,
          points: snapshot.points,
          source: snapshot.source,
          raw_response: (snapshot.rawResponse ?? null) as never,
        })
        .select('id')
        .single()
      if (!error && data) {
        return NextResponse.json({ ...snapshot, id: data.id, persisted: true })
      }
    }
  } catch {
    // fall through — return snapshot without persistence
  }

  return NextResponse.json({ ...snapshot, persisted: false })
}
