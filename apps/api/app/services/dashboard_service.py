from datetime import datetime, timezone

from supabase import Client

from app.domain.dates import day_bounds_utc
from app.services import analytics_service, nutrition_service


def get_dashboard(client: Client, user_id: str) -> dict:
    today = datetime.now(timezone.utc).date()
    start, end = day_bounds_utc(today)

    profile_result = (
        client.table("user_profiles")
        .select("id, display_name, timezone, created_at, updated_at")
        .eq("id", user_id)
        .single()
        .execute()
    )

    nutrition = nutrition_service.get_daily_nutrition(client, user_id, today)

    workout_result = (
        client.table("workout_sessions")
        .select("id")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .gte("started_at", start)
        .lte("started_at", end)
        .limit(1)
        .execute()
    )

    weight_result = (
        client.table("body_metrics")
        .select("id, recorded_at, metric_type, value, unit")
        .eq("user_id", user_id)
        .eq("metric_type", "weight")
        .is_("deleted_at", "null")
        .order("recorded_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    return {
        "profile": profile_result.data,
        "nutrition": nutrition,
        "workout_completed_today": len(workout_result.data) > 0,
        "recent_weight": weight_result.data if weight_result else None,
        "weekly_summary": analytics_service.get_weekly_summary(client, user_id),
    }
