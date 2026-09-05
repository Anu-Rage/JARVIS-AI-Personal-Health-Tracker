import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/chat");
  }

  return (
    <main className="hud-grid flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">
          Personal health agent
        </span>
      </div>
      <h1 className="font-mono text-5xl font-bold tracking-tight text-primary">JARVIS</h1>
      <p className="max-w-sm text-text-muted">
        Talk to it like a person. It tracks your meals, workouts and progress with a
        deterministic core underneath — the AI narrates, it never guesses your numbers.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_var(--color-primary),0_0_16px_-4px_var(--color-primary)] hover:bg-primary-hover"
      >
        Sign in
      </Link>
    </main>
  );
}
