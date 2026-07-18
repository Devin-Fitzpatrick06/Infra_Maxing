export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$—'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export function formatPct(n: number, opts?: { decimals?: number }): string {
  if (!Number.isFinite(n)) return '—%'
  const decimals = opts?.decimals ?? 1
  return `${(n * 100).toFixed(decimals)}%`
}

export function formatHours(n: number): string {
  if (!Number.isFinite(n)) return '— h'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.round(n))
  return `${sign}${abs.toLocaleString('en-US')} h`
}

export function formatSignedUsd(n: number): string {
  if (!Number.isFinite(n)) return '$—'
  if (n === 0) return '$0'
  const prefix = n > 0 ? '+' : '−'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${prefix}$${(abs / 1_000).toFixed(0)}K`
  return `${prefix}$${abs.toFixed(0)}`
}
