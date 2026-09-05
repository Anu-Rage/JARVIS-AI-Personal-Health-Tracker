from supabase import Client

from app.domain.dates import DEFAULT_TIMEZONE


def get_timezone(client: Client, user_id: str) -> str:
    result = (
        client.table("user_profiles").select("timezone").eq("id", user_id).maybe_single().execute()
    )
    if result is None or not result.data:
        return DEFAULT_TIMEZONE
    return result.data.get("timezone") or DEFAULT_TIMEZONE


def update_timezone(client: Client, user_id: str, tz_name: str) -> dict:
    result = (
        client.table("user_profiles")
        .update({"timezone": tz_name})
        .eq("id", user_id)
        .execute()
    )
    return result.data[0]
