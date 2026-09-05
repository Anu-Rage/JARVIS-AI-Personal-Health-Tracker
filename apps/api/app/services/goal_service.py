from supabase import Client

from app.schemas.goal import GoalCreate


def get_active_goal(client: Client, user_id: str) -> dict | None:
    result = (
        client.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", True)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def set_goal(client: Client, user_id: str, data: GoalCreate) -> dict:
    # Only one active goal at a time -- deactivate the current one (if any)
    # before inserting the new one, rather than mutating history in place.
    client.table("goals").update({"active": False}).eq("user_id", user_id).eq(
        "active", True
    ).execute()

    result = (
        client.table("goals")
        .insert({"user_id": user_id, "active": True, **data.model_dump()})
        .execute()
    )
    return result.data[0]
