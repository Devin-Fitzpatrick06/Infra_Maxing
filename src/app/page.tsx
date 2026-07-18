import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Builders Cup X
      </h1>
      <p className="max-w-md text-muted-foreground">
        Scaffold is live — auth, database, and deploy are wired up. Product
        surface goes here once the idea is locked in.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/signup" />}>Get started</Button>
        <Button variant="outline" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
