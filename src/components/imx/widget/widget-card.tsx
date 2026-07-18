import * as React from 'react'
import { cn } from '@/lib/utils'

export interface WidgetCardProps {
  label?: string
  action?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  bodyClassName?: string
  interactive?: boolean
  glow?: boolean
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const PADDING: Record<NonNullable<WidgetCardProps['size']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function WidgetCard({
  label,
  action,
  footer,
  className,
  bodyClassName,
  interactive = false,
  glow = false,
  children,
  size = 'md',
}: WidgetCardProps) {
  const hasHeader = Boolean(label) || Boolean(action)
  return (
    <section
      data-slot="widget-card"
      data-interactive={interactive ? 'true' : undefined}
      className={cn(
        'imx-widget relative rounded-xl bg-card/60 ring-1 ring-border/60 transition-colors',
        PADDING[size],
        interactive &&
          'hover:ring-primary/50 hover:shadow-[0_0_40px_-16px_var(--primary-glow)]',
        glow && 'ring-primary/30 shadow-[0_0_40px_-16px_var(--primary-glow)]',
        className,
      )}
    >
      {hasHeader ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {label ? <span className="imx-mono-label">{label}</span> : <span />}
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(bodyClassName)}>{children}</div>
      {footer ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  )
}
