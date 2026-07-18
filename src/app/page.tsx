import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  LiveBadge,
  NavBar,
  PulseDot,
  Sparkline,
  StatWidget,
  StrategyMini,
  WidgetCard,
} from '@/components/imx/widget'

export default function Home() {
  return (
    <main className="imx-grid relative min-h-screen">
      <NavBar />

      <section className="hero">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 pt-16 pb-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/5 text-primary"
            >
              <PulseDot />
              Live Ornn forward × GPU telemetry
            </Badge>

            <h1 className="imx-heading imx-glow imx-gradient-text mt-4 text-6xl leading-[0.9] tracking-tighter md:text-8xl">
              INFRA-MAXXER
            </h1>

            <h2 className="imx-heading mt-2 text-2xl text-primary md:text-4xl">
              Reserve GPUs smarter.
            </h2>

            <p className="mt-3 max-w-xl text-muted-foreground">
              Real-time Ornn forward curves × your fleet telemetry. Decide the
              optimal reserve strategy and quantify savings — in one glance.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/forward" className={buttonVariants({ size: 'lg' })}>
                Enter forward →
              </a>
              <a
                href="/sandbox"
                className={buttonVariants({ size: 'lg', variant: 'outline' })}
              >
                Open sandbox
              </a>
              <a
                href="/debug"
                className={buttonVariants({ size: 'lg', variant: 'ghost' })}
              >
                Engineering
              </a>
            </div>
          </div>

          <div className="md:col-span-5">
            <WidgetCard
              label="MISSION CONTROL"
              action={<LiveBadge source="ORNN LIVE" />}
              glow
              size="lg"
              className="imx-scan"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="imx-mono-label">PROJECTED 12-MO COST</div>
                  <div className="imx-heading imx-gradient-text mt-1 text-3xl leading-none">
                    $666K
                  </div>
                </div>

                <div>
                  <div className="imx-mono-label">SAVINGS VS ON-DEMAND</div>
                  <div className="imx-heading mt-1 text-2xl leading-none text-primary">
                    +$217K
                  </div>
                </div>

                <Sparkline
                  data={[3, 4, 3.5, 5, 6, 5.5, 7, 6.5, 8, 7, 9, 8.5]}
                  height={44}
                />

                <StrategyMini
                  costs={{
                    payAsYouGo: 724570,
                    smartBlend: 666102,
                    reserveNow: 602851,
                  }}
                  savings={{
                    payAsYouGo: 0,
                    smartBlend: 58468,
                    reserveNow: 121719,
                  }}
                  onDemand={724570}
                />
              </div>
            </WidgetCard>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center gap-4">
            <span className="imx-mono-label">THE 30-SECOND PITCH</span>
            <div className="imx-hairline flex-1" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <WidgetCard label="WHAT IT DOES">
              <p className="text-sm text-foreground">
                Watches live GPU forward prices and your fleet usage, then
                picks the reserve strategy that costs the least.
              </p>
            </WidgetCard>
            <WidgetCard label="WHY IT&rsquo;S GREAT" glow>
              <p className="text-sm text-foreground">
                Forwards can be 20–40% cheaper than spot. INFRA-MAXXER shows
                exactly how much you save — no spreadsheets, no guesswork.
              </p>
            </WidgetCard>
            <WidgetCard label="WHAT TEAMS GET">
              <p className="text-sm text-foreground">
                One dashboard: <span className="text-primary">$ saved</span>,
                <span className="text-primary"> % vs on-demand</span>, and
                hours of FinOps review back on the calendar.
              </p>
            </WidgetCard>
          </div>
        </div>
      </section>

      <section className="widget-preview-grid">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-4">
            <span className="imx-mono-label">SIGNALS</span>
            <div className="imx-hairline flex-1" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatWidget
              label="A100 SPOT"
              value="$0.99"
              delta="+2.1%"
              deltaTone="up"
              hint="ORNN hourly index"
              sparkline={[0.92, 0.94, 0.95, 0.94, 0.96, 0.97, 0.98, 0.99]}
            />
            <StatWidget
              label="180-DAY FORWARD"
              value="$0.72"
              delta="-27%"
              deltaTone="down"
              hint="vs. spot today"
              sparkline={[0.92, 0.88, 0.85, 0.82, 0.78, 0.76, 0.74, 0.72]}
              sparkColor="var(--primary)"
            />
            <StatWidget
              label="RUN-RATE"
              value="$55K/mo"
              hint="3 workloads live"
            />
            <StatWidget
              label="TIME BACK"
              value="72 h/yr"
              hint="quarterly FinOps review"
              glow
            />
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-10 flex max-w-7xl items-center justify-between border-t border-border/50 px-6 pt-4 pb-6 text-xs text-muted-foreground">
        <span>Built for Builders Cup X · 2026-07-18</span>
        <div className="flex items-center gap-2">
          <LiveBadge source="ORNN" />
          <span className="text-muted-foreground">
            A100 · B200 · H100 · H200 · RTX 5090 · RTX PRO 6000
          </span>
        </div>
      </footer>
    </main>
  )
}
