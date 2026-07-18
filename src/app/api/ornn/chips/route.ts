import { NextResponse } from 'next/server'
import { getOrnnClient } from '@/lib/ornn/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ornn = getOrnnClient()
    const chips = await ornn.listChips()
    return NextResponse.json({ chips })
  } catch {
    return NextResponse.json({ error: 'chips fetch failed' }, { status: 500 })
  }
}
