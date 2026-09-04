from supabase import Client

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
