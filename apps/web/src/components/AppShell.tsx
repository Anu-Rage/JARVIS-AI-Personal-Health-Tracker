"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meals", label: "Meals" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">JARVIS</span>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-text-muted hover:text-text"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-24">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 py-3 text-center text-sm font-medium ${
                  active ? "text-primary" : "text-text-muted"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
