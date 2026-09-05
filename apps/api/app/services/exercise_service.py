from supabase import Client

from app.schemas.workout import ExerciseCreate


def search_exercises(client: Client, query: str | None, limit: int = 25) -> list[dict]:
    request = client.table("exercises").select("*").order("name").limit(limit)
    if query:
        request = request.ilike("name", f"%{query}%")
    return request.execute().data


def create_exercise(client: Client, data: ExerciseCreate) -> dict:
    result = client.table("exercises").insert(data.model_dump()).execute()
    return result.data[0]
