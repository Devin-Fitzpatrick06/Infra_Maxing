@AGENTS.md

# Builders Cup X — Ramp Builder's Cup Hackathon Project

## Context

Team project for the Ramp Builder's Cup hackathon (2026-07-18, NYC). 4 hours
of hacking (11am-3pm), then a 30-minute demo window. Judged on: Audience
Favorite, Best Game, "Save Time. Save Money.", and Best Use of Sponsors
(Ramp/Cursor/Codex).

**Optimize for the demo, not for production.** The app only needs to survive
a live 30-minute demo — it does not need to be a complete or scalable
product. That said, it must not break mid-demo: prefer simple, predictable
code over clever code, and fake/stub anything fragile (flaky third-party
APIs, live browser automation, etc.) rather than risk a live failure.

**As of the last update to this file, no product idea is locked in yet.**
Everything currently in the repo is idea-agnostic scaffolding: auth, database
connection, deploy pipeline, base UI kit. Do not build domain-specific
features (schema, pages, business logic) until the idea is confirmed by the
user in conversation — check for that before assuming scope.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack by default) — **this is
  newer than your training data; do not assume Next 14/15 APIs.** Notably:
  - `middleware.ts` was renamed to `proxy.ts` (function name `proxy`, not
    `middleware`). See `src/proxy.ts`.
  - `cookies()`, `headers()`, `params`, `searchParams` are async-only (no
    synchronous fallback, unlike Next 15's temporary compat).
  - Before using any App Router API you're unsure about, check
    `node_modules/next/dist/docs/01-app/` — it's the actual installed-version
    docs, not the general web.
- **Supabase** — Postgres DB, Auth, Storage, Edge Functions, Realtime all
  available. Auth uses email/password with **email confirmation disabled**
  in the Supabase dashboard (deliberate: avoids depending on live email
  deliverability during the demo — a reliability tradeoff, not a security
  best practice, revisit if this ever needs to be a real product).
- **Tailwind CSS v4** + **shadcn/ui** (`src/components/ui/`) — add more
  components with `npx shadcn@latest add <name>`. v0.dev and 21st.dev both
  emit shadcn-compatible code, so pasted components should drop in directly.
- **Vercel** for deploy, connected to this GitHub repo.

## Structure

- `src/lib/supabase/client.ts` — browser Supabase client.
- `src/lib/supabase/server.ts` — server Supabase client (Server
  Components/Actions/Route Handlers). Create a fresh instance per request —
  don't cache it.
- `src/proxy.ts` — refreshes the Supabase session cookie on every request and
  does an optimistic (cookie-only) redirect for unauthenticated users. Real
  auth checks still happen in `src/app/dashboard/page.tsx` itself — proxy
  redirects are a UX nicety, not the security boundary.
- `src/app/actions/auth.ts` — `login` / `signup` / `logout` Server Actions.
- `src/app/login`, `src/app/signup`, `src/app/dashboard` — auth flow +
  protected placeholder page.
- `supabase/migrations/0001_profiles.sql` — the one idea-agnostic table
  (`profiles`, synced to `auth.users` via trigger). Run manually in the
  Supabase SQL editor; there's no CLI-based migration flow set up.

## Conventions

- Server Actions over API routes for mutations, per the Next.js 16 auth
  guide pattern (`useActionState` + `<form action={...}>`).
- Keep secrets server-side only. `SUPABASE_SERVICE_ROLE_KEY` must never reach
  a Client Component — only `NEXT_PUBLIC_*` vars are safe there.
- No test suite set up (hackathon speed tradeoff) — verify by running the app
  and clicking through the flow, not by writing tests, unless the user asks.
