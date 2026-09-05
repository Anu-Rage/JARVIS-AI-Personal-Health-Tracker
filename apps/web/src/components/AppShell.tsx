"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import { detectTimezone } from "@/lib/timezone";
import type { UserProfile } from "@jarvis/types";

const TABS = [
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Today" },
  { href: "/meals", label: "Meals" },
  { href: "/workouts", label: "Workouts" },
  { href: "/progress", label: "Progress" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Every "today" the backend computes (dashboard, nutrition, meal/workout
    // day filters) is anchored to the profile's stored timezone, which
    // defaults to "UTC" until something sets it -- silently misdating
    // "today" for hours around midnight for anyone not on UTC. Sync the
    // browser's real timezone in once per load rather than requiring a
    // settings page.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const profile = await apiFetch<UserProfile>("/api/v1/users/me", session.access_token);
        const detected = detectTimezone();
        if (profile.timezone !== detected) {
          await apiFetch<UserProfile>("/api/v1/users/me", session.access_token, {
            method: "PATCH",
            body: JSON.stringify({ timezone: detected }),
          });
        }
      } catch {
        // non-critical -- worst case "today" stays anchored to the old zone
      }
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="hud-grid border-b border-border bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]">
              Jarvis
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-text"
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
                className={`flex-1 border-t-2 py-3 text-center font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
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
