import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { WeeklyReportButton } from "@/components/WeeklyReportButton";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import type { DashboardResponse } from "@jarvis/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  let dashboard: DashboardResponse | null = null;
  let error: string | null = null;

  try {
    dashboard = await apiFetch<DashboardResponse>("/api/v1/dashboard", session.access_token);
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
        <div className="flex items-center gap-3">
          <Link href="/goals" className="text-xs text-text-muted underline">
            Goals
          </Link>
          <Link
            href="/meals"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            + Log a meal
          </Link>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}

      {dashboard && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Calories"
                value={Math.round(dashboard.nutrition.totals.calories)}
                unit="kcal"
              />
              <StatTile
                label="Protein"
                value={Math.round(dashboard.nutrition.totals.protein_g)}
                unit="g"
              />
              <StatTile
                label="Carbs"
                value={Math.round(dashboard.nutrition.totals.carbs_g)}
                unit="g"
              />
              <StatTile label="Fat" value={Math.round(dashboard.nutrition.totals.fat_g)} unit="g" />
            </div>

            {dashboard.nutrition.remaining.calorie_target != null && (
              <p className="mt-3 text-sm text-text-muted">
                {Math.round(dashboard.nutrition.remaining.calories_remaining ?? 0)} kcal remaining
                of {dashboard.nutrition.remaining.calorie_target} target
              </p>
            )}

            <p className="mt-1 text-xs text-text-muted">
              {dashboard.nutrition.meal_count} meal
              {dashboard.nutrition.meal_count === 1 ? "" : "s"} logged today
            </p>
          </Card>

          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-muted">Logged today</h2>
              <Link href="/meals" className="text-xs text-primary">
                View history
              </Link>
            </div>
            {dashboard.today_meals.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.today_meals.map((meal) => (
                  <li key={meal.id}>
                    <p className="text-xs font-medium capitalize text-text-muted">
                      {meal.meal_type}
                    </p>
                    <ul className="text-sm">
                      {meal.meal_items?.map((item) => (
                        <li key={item.id}>
                          {item.quantity}x {item.food_name} — {Math.round(item.calories)} kcal
                          {item.nutrition_confidence === "estimated" && (
                            <span className="ml-1 text-xs italic text-text-muted">
                              (estimated)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-muted">This week</h2>
              <span className="text-xs text-text-muted">
                {dashboard.weekly_summary.days_logged}/{dashboard.weekly_summary.period_days} days
                logged
              </span>
            </div>

            {dashboard.weekly_summary.days_logged > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label="Avg calories"
                    value={Math.round(dashboard.weekly_summary.avg_calories ?? 0)}
                    unit="kcal"
                  />
                  <StatTile
                    label="Avg protein"
                    value={Math.round(dashboard.weekly_summary.avg_protein_g ?? 0)}
                    unit="g"
                  />
                </div>
                {dashboard.weekly_summary.calorie_adherence_rate != null && (
                  <p className="mt-3 text-sm text-text-muted">
                    {Math.round(dashboard.weekly_summary.calorie_adherence_rate * 100)}% of days
                    within your calorie target
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted">No meals logged this week yet.</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile label="Workouts" value={dashboard.weekly_summary.workout_count} unit="sessions" />
              <StatTile
                label="Volume"
                value={Math.round(dashboard.weekly_summary.workout_total_volume_kg)}
                unit="kg"
              />
            </div>

            <p className="mt-3 text-xs text-text-muted">
              {dashboard.weekly_summary.meal_logging_streak}-day meal streak ·{" "}
              {dashboard.weekly_summary.workout_logging_streak}-day workout streak
            </p>

            {dashboard.weekly_summary.weight_change != null && (
              <p className="mt-1 text-xs text-text-muted">
                Weight {dashboard.weekly_summary.weight_change > 0 ? "+" : ""}
                {dashboard.weekly_summary.weight_change.toFixed(1)}kg this week
              </p>
            )}

            <WeeklyReportButton />
          </Card>

          <Card className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  dashboard.workout_completed_today ? "bg-primary" : "bg-border"
                }`}
              />
              {dashboard.workout_completed_today ? "Workout logged today" : "No workout logged today"}
            </div>
            <Link href="/workouts" className="text-xs text-primary">
              {dashboard.workout_completed_today ? "View" : "Log one"}
            </Link>
          </Card>

          <Card className="mb-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-text-muted">Latest weight: </span>
              {dashboard.recent_weight ? (
                <span className="font-medium">
                  {dashboard.recent_weight.value} {dashboard.recent_weight.unit}
                </span>
              ) : (
                <span className="text-text-muted">not logged yet</span>
              )}
            </div>
            <Link href="/progress" className="text-xs text-primary">
              {dashboard.recent_weight ? "View" : "Log it"}
            </Link>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-medium text-text-muted">Profile</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Display name</dt>
                <dd>{dashboard.profile.display_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Timezone</dt>
                <dd>{dashboard.profile.timezone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Member since</dt>
                <dd>{new Date(dashboard.profile.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </AppShell>
  );
}
