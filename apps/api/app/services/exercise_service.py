from supabase import Client

from app.domain.text import name_variants
from app.schemas.workout import ExerciseCreate


def search_exercises(client: Client, query: str | None, limit: int = 25) -> list[dict]:
    request = client.table("exercises").select("*").order("name").limit(limit)
    if query:
        request = request.ilike("name", f"%{query}%")
    return request.execute().data


def create_exercise(client: Client, data: ExerciseCreate) -> dict:
    result = client.table("exercises").insert(data.model_dump()).execute()
    return result.data[0]


def resolve_exercise_by_name(client: Client, name: str) -> dict | None:
    """Resolve a free-text exercise name to a concrete exercise row. Only
    resolves on an unambiguous match (see food_service.resolve_food_serving_by_name
    for the same rationale)."""
    for variant in name_variants(name):
        exact = client.table("exercises").select("*").ilike("name", variant).execute()
        if len(exact.data) == 1:
            return exact.data[0]

    partial = client.table("exercises").select("*").ilike("name", f"%{name}%").limit(5).execute()
    if len(partial.data) != 1:
        return None
    return partial.data[0]
