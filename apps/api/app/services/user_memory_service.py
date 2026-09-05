from supabase import Client

from app.schemas.user_memory import UserMemoryCreate


def list_memory(client: Client, user_id: str, category: str | None = None) -> list[dict]:
    request = (
        client.table("user_memory")
        .select("id, category, key, value")
        .eq("user_id", user_id)
        .order("category")
        .order("key")
    )
    if category:
        request = request.eq("category", category)
    return request.execute().data


def set_memory(client: Client, user_id: str, data: UserMemoryCreate) -> dict:
    # Upsert on the (user_id, category, key) unique constraint: saying the
    # same fact again updates it rather than erroring or duplicating.
    result = (
        client.table("user_memory")
        .upsert(
            {
                "user_id": user_id,
                "category": data.category,
                "key": data.key,
                "value": data.value,
            },
            on_conflict="user_id,category,key",
        )
        .execute()
    )
    row = result.data[0]
    return {k: row[k] for k in ("id", "category", "key", "value")}


def delete_memory(client: Client, user_id: str, memory_id: str) -> bool:
    result = (
        client.table("user_memory")
        .delete()
        .eq("id", memory_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0
