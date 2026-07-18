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

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Builders Cup X</h1>
        <p className="mt-2 text-muted-foreground">
          Next.js 16 · Supabase · Tailwind · shadcn/ui
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            Delete this card once the app has real content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">
            Supabase env vars:{' '}
            <span
              className={
                supabaseConfigured
                  ? 'font-medium text-green-600 dark:text-green-400'
                  : 'font-medium text-amber-600 dark:text-amber-400'
              }
            >
              {supabaseConfigured ? 'detected' : 'not set — copy .env.local.example'}
            </span>
          </span>
          <a
            className={buttonVariants({ variant: 'outline' })}
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase dashboard
          </a>
        </CardContent>
      </Card>
    </main>
  )
}
