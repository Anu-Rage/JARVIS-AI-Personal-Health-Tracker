from datetime import date

from supabase import Client

from app.domain.nutrition import NutritionValues, sum_nutrition
from app.services.meal_service import list_meals


def _get_active_goal(client: Client, user_id: str) -> dict | None:
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


def get_daily_nutrition(client: Client, user_id: str, day: date) -> dict:
    meals = list_meals(client, user_id, day)

    item_totals = [
        NutritionValues(
            calories=item["calories"],
            protein_g=item["protein_g"],
            carbs_g=item["carbs_g"],
            fat_g=item["fat_g"],
            fiber_g=item["fiber_g"],
        )
        for meal in meals
        for item in meal["meal_items"]
    ]
    totals = sum_nutrition(item_totals)

    goal = _get_active_goal(client, user_id)

    def remaining(target: float | None, consumed: float) -> float | None:
        return None if target is None else target - consumed

    return {
        "date": day.isoformat(),
        "totals": {
            "calories": totals.calories,
            "protein_g": totals.protein_g,
            "carbs_g": totals.carbs_g,
            "fat_g": totals.fat_g,
            "fiber_g": totals.fiber_g,
        },
        "meal_count": len(meals),
        "remaining": {
            "calorie_target": goal.get("calorie_target") if goal else None,
            "protein_target_g": goal.get("protein_target_g") if goal else None,
            "carb_target_g": goal.get("carb_target_g") if goal else None,
            "fat_target_g": goal.get("fat_target_g") if goal else None,
            "calories_remaining": remaining(goal.get("calorie_target") if goal else None, totals.calories),
            "protein_remaining_g": remaining(goal.get("protein_target_g") if goal else None, totals.protein_g),
            "carbs_remaining_g": remaining(goal.get("carb_target_g") if goal else None, totals.carbs_g),
            "fat_remaining_g": remaining(goal.get("fat_target_g") if goal else None, totals.fat_g),
        },
    }
