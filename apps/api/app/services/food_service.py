from supabase import Client

from app.domain.text import name_variants
from app.schemas.food import FoodCreate

_FOOD_SELECT = "*, food_servings!food_servings_food_id_fkey(*)"


def search_foods(client: Client, query: str | None, limit: int = 25) -> list[dict]:
    request = client.table("foods").select(_FOOD_SELECT).order("name").limit(limit)
    if query:
        request = request.ilike("name", f"%{query}%")
    return request.execute().data


def create_food(client: Client, data: FoodCreate) -> dict:
    food_result = (
        client.table("foods")
        .insert({"name": data.name, "source": "user_created"})
        .execute()
    )
    food = food_result.data[0]

    servings_payload = [
        {"food_id": food["id"], **serving.model_dump()} for serving in data.servings
    ]
    servings_result = client.table("food_servings").insert(servings_payload).execute()

    client.table("foods").update({"default_serving_id": servings_result.data[0]["id"]}).eq(
        "id", food["id"]
    ).execute()

    food["default_serving_id"] = servings_result.data[0]["id"]
    food["food_servings"] = servings_result.data
    return food


def resolve_food_serving_by_name(client: Client, name: str) -> dict | None:
    """Resolve a free-text food name (as an AI tool call would supply) to a
    concrete food/serving pair. Only resolves on an unambiguous match --
    an exact case-insensitive name match, or exactly one partial match --
    never guesses among multiple candidates (see §22 of the architecture
    doc: unresolvable/ambiguous foods must never be silently invented).
    """
    food = None
    for variant in name_variants(name):
        exact = client.table("foods").select(_FOOD_SELECT).ilike("name", variant).execute()
        if len(exact.data) == 1:
            food = exact.data[0]
            break

    if food is None:
        partial = (
            client.table("foods").select(_FOOD_SELECT).ilike("name", f"%{name}%").limit(5).execute()
        )
        if len(partial.data) != 1:
            return None
        food = partial.data[0]
    servings = food.get("food_servings") or []
    if not servings:
        return None

    serving = servings[0]
    return {
        "food_id": food["id"],
        "serving_id": serving["id"],
        "food_name": food["name"],
        "serving_description": serving["serving_description"],
    }
