import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import type { DailyNutrition, UserProfile } from "@jarvis/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  let profile: UserProfile | null = null;
  let nutrition: DailyNutrition | null = null;
  let error: string | null = null;

  try {
    [profile, nutrition] = await Promise.all([
      apiFetch<UserProfile>("/api/v1/users/me", session.access_token),
      apiFetch<DailyNutrition>("/api/v1/nutrition/daily", session.access_token),
    ]);
  } catch (err) {
    error =
      err instanceof ApiError
        ? `Backend returned ${err.status}: ${err.message}`
        : "Could not reach the JARVIS API. Is it running?";
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today</h1>
        <Link
          href="/meals"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
        >
          + Log a meal
        </Link>
      </div>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}

      {nutrition && (
        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Calories" value={Math.round(nutrition.totals.calories)} unit="kcal" />
            <StatTile label="Protein" value={Math.round(nutrition.totals.protein_g)} unit="g" />
            <StatTile label="Carbs" value={Math.round(nutrition.totals.carbs_g)} unit="g" />
            <StatTile label="Fat" value={Math.round(nutrition.totals.fat_g)} unit="g" />
          </div>

          {nutrition.remaining.calorie_target != null && (
            <p className="mt-3 text-sm text-text-muted">
              {Math.round(nutrition.remaining.calories_remaining ?? 0)} kcal remaining of{" "}
              {nutrition.remaining.calorie_target} target
            </p>
          )}

          <p className="mt-1 text-xs text-text-muted">
            {nutrition.meal_count} meal{nutrition.meal_count === 1 ? "" : "s"} logged today
          </p>
        </Card>
      )}

      {profile && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Display name</dt>
              <dd>{profile.display_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Timezone</dt>
              <dd>{profile.timezone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Member since</dt>
              <dd>{new Date(profile.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>
      )}
    </AppShell>
  );
}
