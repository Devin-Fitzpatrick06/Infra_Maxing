import { Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="imx-grid relative flex min-h-screen flex-col overflow-hidden">
      <div className="mx-auto my-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
        <Badge variant="outline" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Live Ornn forward × your GPU telemetry
        </Badge>

        <h1 className="imx-heading imx-glow text-6xl leading-none tracking-tighter md:text-8xl">
          INFRA-MAXXER
        </h1>

        <h2 className="imx-heading text-2xl text-primary md:text-4xl">
          Reserve GPUs smarter.
        </h2>

        <p className="max-w-2xl text-muted-foreground">
          Real-time Ornn forward curves × your GPU telemetry. Decide the optimal reserve strategy and quantify savings.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="/forward" className={buttonVariants({ size: 'lg' })}>
            Enter forward →
          </a>
          <a href="/sandbox" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            Open sandbox
          </a>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Built for Builders Cup X · 2026-07-18</span>
        <a href="/debug" className="hover:text-foreground">
          engineering debug
        </a>
      </div>
    </main>
  )
}
