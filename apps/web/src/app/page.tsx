import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold text-primary">JARVIS</h1>
      <p className="max-w-sm text-text-muted">
        Personal health & fitness tracker with a deterministic core and an AI
        layer on top.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Sign in
      </Link>
    </main>
  );
}
