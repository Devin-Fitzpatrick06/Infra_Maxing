import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/decisions?workloadId=...
// Lists decisions, optionally filtered by workloadId, newest first.
export async function GET(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ decisions: [], persisted: false })
  }
  const { searchParams } = new URL(req.url)
  const workloadId = searchParams.get('workloadId')

  const supabase = await createClient()
  let query = supabase
    .from('decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (workloadId) query = query.eq('workload_id', workloadId)
  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ decisions: data ?? [] })
}
