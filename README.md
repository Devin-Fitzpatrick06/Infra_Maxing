# Builders Cup X

Ramp Builder's Cup hackathon project. Next.js 16 (App Router) + Supabase +
Vercel, styled with Tailwind + shadcn/ui.

Product idea isn't locked in yet — see `CLAUDE.md` for full context. This
README covers the one-time manual setup needed to get the scaffold running.

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New
   project.
2. Once it's ready: **Project Settings → API** → copy the `Project URL` and
   `anon public` key, and the `service_role` key.
3. **Authentication → Sign In / Providers → Email** → turn **off** "Confirm
   email". This is a deliberate hackathon-only tradeoff so signup doesn't
   depend on live email deliverability during the demo.
4. **SQL Editor → New query** → paste the contents of
   `supabase/migrations/0001_profiles.sql` → Run.

## 2. Local environment

```bash
cp .env.local.example .env.local
```

Fill in the three values from step 1. Then:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up, confirm you land on `/dashboard`
showing your email, and that a row appears in the Supabase **Table Editor →
profiles**.

## 3. Deploy to Vercel

1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo.
2. Add the same three env vars from `.env.local` under **Settings →
   Environment Variables** (all environments).
3. Deploy. Every push to `main` will auto-deploy after this.

## 4. Add teammates to the GitHub repo

Repo → **Settings → Collaborators and teams → Add people** → enter their
GitHub username or email → they accept the invite emailed to them. Works any
time, no need to wait until the venue.
