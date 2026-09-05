from datetime import datetime, timezone

from supabase import Client

from app.schemas.body_metric import BodyMetricCreate


def list_metrics(client: Client, user_id: str, metric_type: str | None = None) -> list[dict]:
    request = (
        client.table("body_metrics")
        .select("id, recorded_at, metric_type, value, unit")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .order("recorded_at", desc=True)
    )
    if metric_type:
        request = request.eq("metric_type", metric_type)
    return request.execute().data


def create_metric(client: Client, user_id: str, data: BodyMetricCreate) -> dict:
    result = (
        client.table("body_metrics")
        .insert(
            {
                "user_id": user_id,
                "recorded_at": data.recorded_at.isoformat(),
                "metric_type": data.metric_type,
                "value": data.value,
                "unit": data.unit,
            }
        )
        .execute()
    )
    row = result.data[0]
    return {k: row[k] for k in ("id", "recorded_at", "metric_type", "value", "unit")}


def soft_delete_metric(client: Client, user_id: str, metric_id: str) -> bool:
    result = (
        client.table("body_metrics")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", metric_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return len(result.data) > 0
