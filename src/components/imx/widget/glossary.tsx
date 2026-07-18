'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WidgetCard } from './widget-card'

interface Term {
  term: string
  def: string
}

interface GlossaryProps {
  terms?: Term[]
  defaultOpen?: boolean
  className?: string
  title?: string
}

const DEFAULT_TERMS: Term[] = [
  {
    term: 'Spot',
    def: "Today's on-demand GPU price — what you pay if you rent right now.",
  },
  {
    term: 'Forward',
    def: 'A locked-in future price. Usually cheaper than spot when the market expects supply.',
  },
  {
    term: 'Reserve',
    def: 'Commit to buy capacity ahead of time. Trades flexibility for a discount.',
  },
  {
    term: 'Baseline share',
    def: 'How much of your steady demand you cover with a reservation vs. on-demand.',
  },
  {
    term: 'Smart blend',
    def: "The optimizer's pick: reserve what you'll always use, burst the rest on-demand.",
  },
  {
    term: 'Hedge saves',
    def: 'Dollars avoided by locking the forward instead of paying spot for the whole horizon.',
  },
]

export function Glossary({
  terms = DEFAULT_TERMS,
  defaultOpen = false,
  className,
  title = 'GLOSSARY',
}: GlossaryProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <WidgetCard
      label={title}
      className={className}
      action={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={open}
          aria-controls="glossary-body"
        >
          {open ? 'Hide' : 'Show'}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      }
    >
      {!open ? (
        <p className="text-xs text-muted-foreground">
          Quick definitions for the terms on this page.
        </p>
      ) : (
        <dl
          id="glossary-body"
          className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2"
        >
          {terms.map((t) => (
            <div key={t.term} className="flex flex-col gap-0.5">
              <dt className="imx-mono-label">{t.term}</dt>
              <dd className="text-xs text-muted-foreground leading-snug">
                {t.def}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </WidgetCard>
  )
}
