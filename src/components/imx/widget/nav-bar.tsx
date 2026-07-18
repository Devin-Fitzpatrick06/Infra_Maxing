'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LiveBadge } from './live-badge'

interface NavLink {
  href: string
  label: string
}

const LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/forward', label: 'Forward' },
  { href: '/sandbox', label: 'Sandbox' },
]

export interface NavBarProps {
  source?: string
  className?: string
}

export function NavBar({ source = 'ORNN', className }: NavBarProps) {
  const pathname = usePathname()
  return (
    <nav
      className={cn(
        'sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur',
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-primary shadow-[0_0_10px_var(--primary-glow)]" />
          <span className="imx-heading text-sm tracking-tight text-primary">
            INFRA-MAXXER
          </span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <LiveBadge source={source} />
      </div>
    </nav>
  )
}
