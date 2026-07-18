import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

export function BackButton({
  href = '/',
  label = 'Back to home',
  className,
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary',
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
