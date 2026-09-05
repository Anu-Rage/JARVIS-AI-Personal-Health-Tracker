from datetime import date, datetime, timedelta, timezone

from supabase import Client

from app.domain.analytics import calorie_adherence_rate, current_streak, mean
from app.domain.dates import day_bounds_utc
from app.domain.nutrition import NutritionValues, sum_nutrition
from app.domain.workout import SetVolume, calculate_total_volume


def get_weekly_summary(client: Client, user_id: str, period_days: int = 7) -> dict:
    today = datetime.now(timezone.utc).date()
    start_day = today - timedelta(days=period_days - 1)
    start_iso, _ = day_bounds_utc(start_day)
    _, end_iso = day_bounds_utc(today)

    daily_totals = _daily_nutrition_totals(client, user_id, start_iso, end_iso)
    days_logged = len(daily_totals)
    calorie_values = [t.calories for t in daily_totals.values()]

    goal = _get_active_goal(client, user_id)
    adherence = None
    if goal and goal.get("calorie_target"):
        adherence = calorie_adherence_rate(calorie_values, goal["calorie_target"])

    meal_days = {date.fromisoformat(d) for d in daily_totals}
    meal_streak = current_streak(meal_days, today)

    workout_days, workout_count, total_volume = _workout_stats(client, user_id, start_iso, end_iso)
    workout_streak = current_streak(workout_days, today)

    weight_start, weight_end = _weight_range(client, user_id, start_iso, end_iso)
    weight_change = (
        weight_end - weight_start if weight_start is not None and weight_end is not None else None
    )

    return {
        "period_days": period_days,
        "days_logged": days_logged,
        "avg_calories": mean(calorie_values),
        "avg_protein_g": mean([t.protein_g for t in daily_totals.values()]),
        "avg_carbs_g": mean([t.carbs_g for t in daily_totals.values()]),
        "avg_fat_g": mean([t.fat_g for t in daily_totals.values()]),
        "calorie_adherence_rate": adherence,
        "workout_count": workout_count,
        "workout_total_volume_kg": total_volume,
        "meal_logging_streak": meal_streak,
        "workout_logging_streak": workout_streak,
        "weight_start": weight_start,
        "weight_end": weight_end,
        "weight_change": weight_change,
    }


def _daily_nutrition_totals(
    client: Client, user_id: str, start_iso: str, end_iso: str
) -> dict[str, NutritionValues]:
    result = (
        client.table("meals")
        .select("logged_at, meal_items(calories, protein_g, carbs_g, fat_g, fiber_g)")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .gte("logged_at", start_iso)
        .lte("logged_at", end_iso)
        .execute()
    )

    by_day: dict[str, list[NutritionValues]] = {}
    for meal in result.data:
        day_key = meal["logged_at"][:10]
        items = [
            NutritionValues(
                calories=item["calories"],
                protein_g=item["protein_g"],
                carbs_g=item["carbs_g"],
                fat_g=item["fat_g"],
                fiber_g=item["fiber_g"],
            )
            for item in meal.get("meal_items", [])
        ]
        by_day.setdefault(day_key, []).extend(items)

    return {day: sum_nutrition(items) for day, items in by_day.items()}


def _get_active_goal(client: Client, user_id: str) -> dict | None:
    result = (
        client.table("goals")
        .select("calorie_target")
        .eq("user_id", user_id)
        .eq("active", True)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def _workout_stats(
    client: Client, user_id: str, start_iso: str, end_iso: str
) -> tuple[set[date], int, float]:
    result = (
        client.table("workout_sessions")
        .select("started_at, workout_exercises(workout_sets(reps, weight_kg))")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .gte("started_at", start_iso)
        .lte("started_at", end_iso)
        .execute()
    )

    workout_days: set[date] = set()
    all_sets: list[SetVolume] = []
    for session in result.data:
        workout_days.add(date.fromisoformat(session["started_at"][:10]))
        for we in session.get("workout_exercises", []):
            for s in we.get("workout_sets", []):
                all_sets.append(SetVolume(reps=s["reps"] or 0, weight_kg=s["weight_kg"] or 0))

    return workout_days, len(result.data), calculate_total_volume(all_sets)


def _weight_range(
    client: Client, user_id: str, start_iso: str, end_iso: str
) -> tuple[float | None, float | None]:
    result = (
        client.table("body_metrics")
        .select("recorded_at, value")
        .eq("user_id", user_id)
        .eq("metric_type", "weight")
        .is_("deleted_at", "null")
        .gte("recorded_at", start_iso)
        .lte("recorded_at", end_iso)
        .order("recorded_at")
        .execute()
    )
    if not result.data:
        return None, None
    return result.data[0]["value"], result.data[-1]["value"]
