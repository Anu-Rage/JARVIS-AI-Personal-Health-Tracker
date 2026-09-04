import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold">JARVIS</h1>
      <p className="max-w-sm text-gray-500">
        Personal health & fitness tracker with a deterministic core and an AI
        layer on top.
      </p>
      <Link
        href="/login"
        className="rounded bg-black px-4 py-2 text-white"
      >
        Sign in
      </Link>
    </main>
  );
}
