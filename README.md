# Builders Cup X

Ramp Builder's Cup hackathon project. Next.js 16 (App Router) + Supabase +
Vercel, styled with Tailwind + shadcn/ui.

## Getting started

```bash
git clone https://github.com/Devin-Fitzpatrick06/Builders_Cup_X.git
cd Builders_Cup_X
npm install
cp .env.local.example .env.local   # fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>. The landing page shows whether `.env.local`
picked up the Supabase keys.

## Stack

- **Framework** — Next.js 16 (App Router, React 19). Note: `middleware.ts` is
  now `proxy.ts` (see `src/proxy.ts`); `cookies()` is async. Check
  `node_modules/next/dist/docs/` before assuming behavior from prior Next
  versions.
- **Auth + DB** — Supabase via `@supabase/ssr`. Helpers in
  `src/lib/supabase/`:
  - `client.ts` — browser client (`'use client'` components).
  - `server.ts` — server client (Server Components, Route Handlers, Server
    Actions).
  - `proxy.ts` — session refresh helper called from `src/proxy.ts`.
- **UI** — Tailwind v4 + shadcn/ui (`components.json` at repo root). Add
  components with `npx shadcn@latest add <name>`.
- **Deploy** — Vercel. Environment variables must be set in the Vercel
  dashboard as well as locally.

## Environment variables

Copy `.env.local.example` to `.env.local`. Values live in Supabase
dashboard → Project settings → Data API.

| Var                             | Where it's used                     |
| ------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Both server and browser clients     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both server and browser clients     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only. Never import in `'use client'` files |

## Scripts

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `npm run dev`    | Start the dev server on :3000   |
| `npm run build`  | Production build                |
| `npm start`      | Serve the production build      |
| `npm run lint`   | ESLint                          |

## Layout

```
src/
  app/            # App Router routes (page.tsx, layout.tsx, ...)
  components/
    ui/           # shadcn primitives
  lib/
    supabase/     # createClient() helpers
    utils.ts      # shadcn's cn()
  proxy.ts        # Next 16 proxy (formerly middleware) — refreshes Supabase session
```
