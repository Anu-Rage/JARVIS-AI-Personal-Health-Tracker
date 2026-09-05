import json
import logging

from openai import OpenAI
from supabase import Client

from app.core.config import get_settings
from app.domain.text import name_variants
from app.schemas.food import FoodCreate

logger = logging.getLogger("jarvis.agent")

_FOOD_SELECT = "*, food_servings!food_servings_food_id_fkey(*)"

# Same model/pricing as the rest of the AI layer per ADR-007 -- no routing
# until usage data says otherwise.
_ESTIMATE_MODEL = "gpt-4.1-mini"
_PRICE_PER_1M_INPUT_TOKENS = 0.15
_PRICE_PER_1M_OUTPUT_TOKENS = 0.60

_ESTIMATE_PROMPT = (
    "Estimate typical nutrition for one common serving of this food: {name}\n\n"
    'Respond with JSON only: {{"serving_description": string, "calories": number, '
    '"protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number}}. '
    'Use a realistic, commonly-eaten portion (e.g. "1 cup", "100g", "1 medium").'
)


def search_foods(client: Client, query: str | None, limit: int = 25) -> list[dict]:
    request = client.table("foods").select(_FOOD_SELECT).order("name").limit(limit)
    if query:
        request = request.ilike("name", f"%{query}%")
    return request.execute().data


def _insert_food(client: Client, name: str, source: str, servings: list[dict]) -> dict:
    food_result = client.table("foods").insert({"name": name, "source": source}).execute()
    food = food_result.data[0]

    servings_payload = [{"food_id": food["id"], **serving} for serving in servings]
    servings_result = client.table("food_servings").insert(servings_payload).execute()

    client.table("foods").update({"default_serving_id": servings_result.data[0]["id"]}).eq(
        "id", food["id"]
    ).execute()

    food["default_serving_id"] = servings_result.data[0]["id"]
    food["food_servings"] = servings_result.data
    return food


def create_food(client: Client, data: FoodCreate) -> dict:
    return _insert_food(
        client, data.name, "user_created", [serving.model_dump() for serving in data.servings]
    )


def estimate_and_create_food(client: Client, name: str) -> dict:
    """Ask the model for a plausible nutrition estimate for a food that isn't
    in the catalog yet, then store it as a normal 'ai_estimated' row. Only
    the *creation* of this one catalog entry is AI-assisted -- every
    downstream total (daily macros, weekly averages, goal adherence) still
    sums up plain numeric rows exactly as it always has, per ADR-008. The
    row is reusable and flagged so the UI can show it was estimated, same
    as photo-analyzed meal items already are.
    """
    openai_client = OpenAI(api_key=get_settings().openai_api_key)
    response = openai_client.chat.completions.create(
        model=_ESTIMATE_MODEL,
        messages=[{"role": "user", "content": _ESTIMATE_PROMPT.format(name=name)}],
        response_format={"type": "json_object"},
    )

    if response.usage:
        cost = (
            response.usage.prompt_tokens / 1_000_000 * _PRICE_PER_1M_INPUT_TOKENS
            + response.usage.completion_tokens / 1_000_000 * _PRICE_PER_1M_OUTPUT_TOKENS
        )
        logger.info(
            "food_estimate model=%s food=%s prompt_tokens=%d completion_tokens=%d estimated_cost_usd=%.6f",
            _ESTIMATE_MODEL,
            name,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
            cost,
        )

    try:
        parsed = json.loads(response.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        parsed = {}

    def _positive_float(value: object) -> float:
        try:
            return max(0.0, float(value))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.0

    serving = {
        "serving_description": parsed.get("serving_description") or "1 serving",
        "calories": _positive_float(parsed.get("calories")),
        "protein_g": _positive_float(parsed.get("protein_g")),
        "carbs_g": _positive_float(parsed.get("carbs_g")),
        "fat_g": _positive_float(parsed.get("fat_g")),
        "fiber_g": _positive_float(parsed.get("fiber_g")),
    }
    return _insert_food(client, name, "ai_estimated", [serving])


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
