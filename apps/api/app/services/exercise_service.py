from supabase import Client

from app.domain.text import name_variants
from app.schemas.workout import ExerciseCreate

# Category is descriptive metadata only -- it never feeds any calculated
# total (volume is always reps x weight, computed deterministically), so a
# cheap keyword guess is enough and avoids spending an LLM call on a new
# exercise the way estimate_and_create_food needs one for real nutrition
# numbers.
_CARDIO_KEYWORDS = {
    "run", "jog", "cycle", "cycling", "row", "rowing", "swim", "walk",
    "sprint", "bike", "biking", "elliptical", "jump rope", "stair",
}
_MOBILITY_KEYWORDS = {"stretch", "yoga", "mobility", "foam roll", "warm up", "cool down"}


def _guess_category(name: str) -> str:
    lowered = name.lower()
    if any(keyword in lowered for keyword in _CARDIO_KEYWORDS):
        return "cardio"
    if any(keyword in lowered for keyword in _MOBILITY_KEYWORDS):
        return "mobility"
    return "strength"


def search_exercises(client: Client, query: str | None, limit: int = 25) -> list[dict]:
    request = client.table("exercises").select("*").order("name").limit(limit)
    if query:
        request = request.ilike("name", f"%{query}%")
    return request.execute().data


def create_exercise(client: Client, data: ExerciseCreate) -> dict:
    result = client.table("exercises").insert(data.model_dump()).execute()
    return result.data[0]


def classify_and_create_exercise(client: Client, name: str) -> dict:
    return create_exercise(client, ExerciseCreate(name=name, category=_guess_category(name)))


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
