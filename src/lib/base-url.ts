import { headers } from 'next/headers'

// Best-effort server-side URL builder for calling our own API routes from
// server components. Falls back to localhost:3000 in dev.
export async function absoluteUrl(path: string): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host') ?? 'localhost:3000'
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}${path.startsWith('/') ? path : `/${path}`}`
  } catch {
    return `http://localhost:3000${path.startsWith('/') ? path : `/${path}`}`
  }
}
