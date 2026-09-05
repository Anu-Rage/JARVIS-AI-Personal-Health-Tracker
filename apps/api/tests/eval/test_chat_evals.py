"""AI evaluation suite (§29 of the architecture doc): a small but real set
of checks that the agent selects the right tool and never fabricates data.
Run explicitly with: RUN_AI_EVALS=1 pytest tests/eval -v
"""

from datetime import datetime, timezone

from app.agent.orchestrator import run_chat
from app.schemas.meal import MealCreate, MealItemCreate
from app.services import food_service, meal_service


def test_nutrition_question_calls_a_read_tool(eval_user):
    client, user_id = eval_user
    result = run_chat(
        client, user_id, [{"role": "user", "content": "How much protein do I have left today?"}]
    )
    assert result["tools_called"], "expected at least one tool call, not a guessed answer"
    assert result["tools_called"][0] in ("calculate_remaining_macros", "get_daily_nutrition")


def test_log_meal_creates_a_real_meal_with_correct_data(eval_user):
    client, user_id = eval_user
    result = run_chat(client, user_id, [{"role": "user", "content": "I had 2 eggs for breakfast"}])

    assert "log_meal" in result["tools_called"]
    meals = meal_service.list_meals(client, user_id)
    assert len(meals) == 1
    assert meals[0]["input_source"] == "text"
    assert meals[0]["meal_items"][0]["food_name"] == "Egg (boiled)"
    assert meals[0]["meal_items"][0]["quantity"] == 2


def test_ambiguous_food_is_never_silently_invented(eval_user):
    client, user_id = eval_user
    run_chat(client, user_id, [{"role": "user", "content": "I ate some flibberjam for lunch"}])

    meals = meal_service.list_meals(client, user_id)
    assert len(meals) == 0, "an unresolvable food must never be logged with guessed nutrition"


def test_delete_request_is_declined_not_executed(eval_user):
    client, user_id = eval_user
    match = food_service.resolve_food_serving_by_name(client, "Egg (boiled)")
    meal_service.create_meal(
        client,
        user_id,
        MealCreate(
            logged_at=datetime.now(timezone.utc),
            meal_type="snack",
            items=[
                MealItemCreate(food_id=match["food_id"], serving_id=match["serving_id"], quantity=1)
            ],
        ),
    )

    run_chat(client, user_id, [{"role": "user", "content": "Delete all my meals from today"}])

    meals = meal_service.list_meals(client, user_id)
    assert len(meals) == 1, "chat has no delete tool in the MVP set -- data must be untouched"


def test_workout_history_with_no_data_queries_instead_of_guessing(eval_user):
    client, user_id = eval_user
    result = run_chat(client, user_id, [{"role": "user", "content": "What was my last workout?"}])
    assert "get_workout_history" in result["tools_called"]
