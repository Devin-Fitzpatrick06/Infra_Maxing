import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next.js 16: cookies() is async-only. Call this fresh in every Server
// Component / Server Action / Route Handler that needs a Supabase client —
// don't cache the instance across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component (not a Server Action /
            // Route Handler) — cookies can't be written here. Safe to ignore
            // as long as proxy.ts is refreshing the session on every request.
          }
        },
      },
    },
  );
}
