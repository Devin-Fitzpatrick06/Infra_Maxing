import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already redirects unauthenticated requests away from this route;
  // this check is the real (non-optimistic) guard for the data below.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </div>
      <p className="mt-4 text-muted-foreground">
        Signed in as <span className="font-medium">{user.email}</span>
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        This is a placeholder — no idea has been locked in yet, so there's no
        product surface here. Once the idea is picked, this page becomes the
        real app shell.
      </p>
    </div>
  );
}
