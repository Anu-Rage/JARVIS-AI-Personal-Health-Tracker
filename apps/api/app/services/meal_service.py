from datetime import date, datetime, timezone

from supabase import Client

from app.domain.dates import local_day_bounds_utc
from app.domain.nutrition import NutritionValues, scale_serving
from app.schemas.meal import MealCreate

_MEAL_SELECT = "*, meal_items(*, foods(name), food_servings(serving_description))"

# Text-parsed quantities come from the user's own words ("2 eggs"); photo
# quantities are the model's visual guess at portion size, inherently less
# reliable even once matched to a real food_servings row (§22).
_CONFIDENCE_BY_SOURCE = {"manual": "verified", "text": "verified", "photo": "estimated"}


class FoodNotFoundError(ValueError):
    """Raised when a meal references a food/serving that doesn't exist."""


def _flatten_meal_items(meal: dict) -> dict:
    for item in meal.get("meal_items", []):
        food = item.pop("foods", None)
        serving = item.pop("food_servings", None)
        item["food_name"] = food["name"] if food else None
        item["serving_description"] = serving["serving_description"] if serving else None
    return meal


def create_meal(client: Client, user_id: str, data: MealCreate) -> dict:
    confidence = _CONFIDENCE_BY_SOURCE[data.input_source]
    serving_ids = [item.serving_id for item in data.items]
    servings_result = (
        client.table("food_servings")
        .select("*, foods!food_servings_food_id_fkey(source)")
        .in_("id", serving_ids)
        .execute()
    )
    servings_by_id = {row["id"]: row for row in servings_result.data}

    for item in data.items:
        serving = servings_by_id.get(item.serving_id)
        if serving is None or serving["food_id"] != item.food_id:
            raise FoodNotFoundError(
                f"No matching food/serving for food_id={item.food_id}, serving_id={item.serving_id}"
            )

    meal_result = (
        client.table("meals")
        .insert(
            {
                "user_id": user_id,
                "logged_at": data.logged_at.isoformat(),
                "meal_type": data.meal_type,
                "input_source": data.input_source,
            }
        )
        .execute()
    )
    meal = meal_result.data[0]

    meal_items_payload = []
    for item in data.items:
        serving = servings_by_id[item.serving_id]
        nutrition = scale_serving(
            NutritionValues(
                calories=serving["calories"],
                protein_g=serving["protein_g"],
                carbs_g=serving["carbs_g"],
                fat_g=serving["fat_g"],
                fiber_g=serving["fiber_g"],
            ),
            item.quantity,
        )
        # An AI-estimated food's macros are never as reliable as a verified
        # one, regardless of how the user logged it (typed, spoken, or
        # manually picked from search) -- the item-level confidence must
        # reflect the food itself, not just the meal's input_source.
        food_source = (serving.get("foods") or {}).get("source")
        item_confidence = "estimated" if food_source == "ai_estimated" else confidence
        meal_items_payload.append(
            {
                "meal_id": meal["id"],
                "food_id": item.food_id,
                "serving_id": item.serving_id,
                "quantity": item.quantity,
                "nutrition_confidence": item_confidence,
                "calories": nutrition.calories,
                "protein_g": nutrition.protein_g,
                "carbs_g": nutrition.carbs_g,
                "fat_g": nutrition.fat_g,
                "fiber_g": nutrition.fiber_g,
            }
        )

    client.table("meal_items").insert(meal_items_payload).execute()

    return get_meal(client, user_id, meal["id"])


def get_meal(client: Client, user_id: str, meal_id: str) -> dict | None:
    result = (
        client.table("meals")
        .select(_MEAL_SELECT)
        .eq("id", meal_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if result is None or result.data is None:
        return None
    return _flatten_meal_items(result.data)


def list_meals(
    client: Client, user_id: str, day: date | None = None, tz_name: str | None = None
) -> list[dict]:
    request = (
        client.table("meals")
        .select(_MEAL_SELECT)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .order("logged_at", desc=True)
    )
    if day is not None:
        start, end = local_day_bounds_utc(day, tz_name)
        request = request.gte("logged_at", start).lte("logged_at", end)

    meals = request.execute().data
    return [_flatten_meal_items(meal) for meal in meals]


def soft_delete_meal(client: Client, user_id: str, meal_id: str) -> bool:
    result = (
        client.table("meals")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", meal_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return len(result.data) > 0
