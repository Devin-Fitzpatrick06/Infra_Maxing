import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Home() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const ornnConfigured = Boolean(process.env.ORNN_API_KEY)

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">GPU Reservation Optimizer</h1>
        <p className="mt-2 text-muted-foreground">
          Ornn forward curves × your GPU telemetry — time reservations, quantify savings.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            Backend proof of life. Fill in <code>.env.local</code> to enable persistence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            Supabase:{' '}
            <span
              className={
                supabaseConfigured
                  ? 'font-medium text-green-600 dark:text-green-400'
                  : 'font-medium text-amber-600 dark:text-amber-400'
              }
            >
              {supabaseConfigured ? 'configured' : 'not set — persistence disabled'}
            </span>
          </div>
          <div>
            Ornn API key:{' '}
            <span
              className={
                ornnConfigured
                  ? 'font-medium text-green-600 dark:text-green-400'
                  : 'font-medium text-amber-600 dark:text-amber-400'
              }
            >
              {ornnConfigured ? 'detected' : 'using fixture curve'}
            </span>
          </div>
          <div>
            Datadog: <span className="font-medium">synthetic (fixture)</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link className={buttonVariants({ variant: 'default' })} href="/sandbox">
          Open sandbox
        </Link>
        <Link className={buttonVariants({ variant: 'outline' })} href="/debug">
          Debug (API dumps)
        </Link>
      </div>
    </main>
  )
}
