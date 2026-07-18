import { NextRequest, NextResponse } from 'next/server'
import { getOrnnClient } from '@/lib/ornn/client'

export const dynamic = 'force-dynamic'

const ALLOWED_DAYS = new Set([30, 90, 180, 365])

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const gpuTypeRaw = url.searchParams.get('gpuType') ?? 'H100'
  const daysRaw = Number(url.searchParams.get('days') ?? 90)

  if (!gpuTypeRaw.trim()) {
    return NextResponse.json({ error: 'gpuType required' }, { status: 400 })
  }
  if (!ALLOWED_DAYS.has(daysRaw)) {
    return NextResponse.json(
      { error: 'days must be one of 30 / 90 / 180 / 365' },
      { status: 400 },
    )
  }

  try {
    const ornn = getOrnnClient()
    const snap = await ornn.getSpotHistory(gpuTypeRaw, daysRaw)
    return NextResponse.json(snap)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'spot-history fetch failed' },
      { status: 500 },
    )
  }
}
