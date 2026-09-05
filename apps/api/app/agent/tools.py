import logging
from datetime import datetime, timezone

from supabase import Client

from app.schemas.meal import MealCreate, MealItemCreate
from app.schemas.workout import WorkoutExerciseCreate, WorkoutSessionCreate, WorkoutSetCreate
from app.services import (
    analytics_service,
    exercise_service,
    food_service,
    meal_service,
    nutrition_service,
    user_memory_service,
    workout_service,
)

logger = logging.getLogger("jarvis.agent")

# OpenAI function-calling tool definitions. The first 6 are the MVP set from
# §31 of the architecture doc; get_weekly_summary was added in Phase 4
# alongside the analytics engine it wraps. Every write tool here is
# additive/reversible (no delete tool exists in this set per ADR-009), so
# none require a confirmation step.
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_daily_nutrition",
            "description": "Get the user's total calories, protein, carbs, fat, and fiber logged today, how many meals were logged, and remaining amounts vs. their goals if set.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_meal",
            "description": "Log a meal the user describes, e.g. '2 eggs and 4 idlis for breakfast'. Each food is matched against the food database; if a food isn't found, its nutrition is estimated automatically and saved to the database for next time -- always tell the user when an item was estimated rather than exact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meal_type": {
                        "type": "string",
                        "enum": ["breakfast", "lunch", "dinner", "snack"],
                    },
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "food_name": {
                                    "type": "string",
                                    "description": "Plain food name, e.g. 'egg', 'idli', 'banana'",
                                },
                                "quantity": {
                                    "type": "number",
                                    "description": "How many servings, e.g. 2 for '2 eggs'",
                                },
                            },
                            "required": ["food_name", "quantity"],
                        },
                    },
                },
                "required": ["meal_type", "items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_workout_history",
            "description": "Get the user's recent workout sessions, most recent first, including exercises, sets, and total volume lifted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Max sessions to return, default 5",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "log_workout",
            "description": "Log a workout the user describes, e.g. '3 sets of pull-ups, 8 reps each'. Each exercise is matched against the exercise database; a new exercise is added automatically if it isn't found yet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "exercises": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "exercise_name": {"type": "string"},
                                "sets": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "reps": {"type": "integer"},
                                            "weight_kg": {
                                                "type": "number",
                                                "description": "0 for bodyweight exercises",
                                            },
                                        },
                                        "required": ["reps", "weight_kg"],
                                    },
                                },
                            },
                            "required": ["exercise_name", "sets"],
                        },
                    },
                },
                "required": ["exercises"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_remaining_macros",
            "description": "Get how many calories/protein/carbs/fat the user has left today against their goals, if they've set any.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_memory",
            "description": "Get remembered facts about the user -- their goals, available equipment, preferences, constraints, or past observations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["goal", "equipment", "preference", "constraint", "observation"],
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weekly_summary",
            "description": "Get the user's last 7 days: average calories/protein/carbs/fat, calorie-target adherence, workout count and total volume, meal/workout logging streaks, and weight change over the period.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _handle_get_daily_nutrition(client: Client, user_id: str, args: dict) -> dict:
    today = datetime.now(timezone.utc).date()
    return nutrition_service.get_daily_nutrition(client, user_id, today)


def _handle_log_meal(client: Client, user_id: str, args: dict) -> dict:
    resolved: list[MealItemCreate] = []
    estimated_foods: list[str] = []

    for item in args.get("items", []):
        match = food_service.resolve_food_serving_by_name(client, item["food_name"])
        if match is None:
            food = food_service.estimate_and_create_food(client, item["food_name"])
            serving = food["food_servings"][0]
            match = {"food_id": food["id"], "serving_id": serving["id"]}
            estimated_foods.append(item["food_name"])
        resolved.append(
            MealItemCreate(
                food_id=match["food_id"],
                serving_id=match["serving_id"],
                quantity=item["quantity"],
            )
        )

    meal_data = MealCreate(
        logged_at=datetime.now(timezone.utc),
        meal_type=args["meal_type"],
        items=resolved,
        input_source="text",
    )
    meal = meal_service.create_meal(client, user_id, meal_data)
    result = {"success": True, "meal": meal}
    if estimated_foods:
        result["estimated_foods"] = estimated_foods
        result["note"] = (
            f"These weren't in the food database, so their nutrition was AI-estimated "
            f"rather than exact: {', '.join(estimated_foods)}. Tell the user this."
        )
    return result


def _handle_get_workout_history(client: Client, user_id: str, args: dict) -> dict:
    limit = args.get("limit", 5)
    sessions = workout_service.list_sessions(client, user_id)
    return {"sessions": sessions[:limit]}


def _handle_log_workout(client: Client, user_id: str, args: dict) -> dict:
    resolved: list[WorkoutExerciseCreate] = []
    new_exercises: list[str] = []

    for exercise in args.get("exercises", []):
        match = exercise_service.resolve_exercise_by_name(client, exercise["exercise_name"])
        if match is None:
            match = exercise_service.classify_and_create_exercise(client, exercise["exercise_name"])
            new_exercises.append(exercise["exercise_name"])
        sets = [
            WorkoutSetCreate(reps=s["reps"], weight_kg=s["weight_kg"]) for s in exercise["sets"]
        ]
        resolved.append(WorkoutExerciseCreate(exercise_id=match["id"], sets=sets))

    session_data = WorkoutSessionCreate(started_at=datetime.now(timezone.utc), exercises=resolved)
    session = workout_service.create_session(client, user_id, session_data)
    result = {"success": True, "workout": session}
    if new_exercises:
        result["new_exercises"] = new_exercises
        result["note"] = (
            f"These weren't in the exercise database, so they were added as new: "
            f"{', '.join(new_exercises)}. Tell the user this."
        )
    return result


def _handle_calculate_remaining_macros(client: Client, user_id: str, args: dict) -> dict:
    today = datetime.now(timezone.utc).date()
    result = nutrition_service.get_daily_nutrition(client, user_id, today)
    return {"remaining": result["remaining"], "totals": result["totals"]}


def _handle_get_user_memory(client: Client, user_id: str, args: dict) -> dict:
    entries = user_memory_service.list_memory(client, user_id, args.get("category"))
    return {"memory": entries}


def _handle_get_weekly_summary(client: Client, user_id: str, args: dict) -> dict:
    return analytics_service.get_weekly_summary(client, user_id)


_TOOL_HANDLERS = {
    "get_daily_nutrition": _handle_get_daily_nutrition,
    "log_meal": _handle_log_meal,
    "get_workout_history": _handle_get_workout_history,
    "log_workout": _handle_log_workout,
    "calculate_remaining_macros": _handle_calculate_remaining_macros,
    "get_user_memory": _handle_get_user_memory,
    "get_weekly_summary": _handle_get_weekly_summary,
}


def execute_tool(client: Client, user_id: str, name: str, arguments: dict) -> dict:
    handler = _TOOL_HANDLERS.get(name)
    if handler is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return handler(client, user_id, arguments)
    except Exception:
        logger.exception("Tool execution failed: name=%s user_id=%s", name, user_id)
        return {"error": "Something went wrong running that. Tell the user to try again shortly."}
