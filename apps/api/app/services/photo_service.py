import base64
import json
import logging

from openai import OpenAI
from supabase import Client

from app.core.config import get_settings
from app.services import food_service

logger = logging.getLogger("jarvis.agent")

# Vision uses the same model as chat per ADR-007 (single cheap model, no
# routing until usage data says otherwise) -- confirmed gpt-4.1-mini accepts
# image input before building this pipeline.
_MODEL = "gpt-4.1-mini"

_PRICE_PER_1M_INPUT_TOKENS = 0.15
_PRICE_PER_1M_OUTPUT_TOKENS = 0.60

_PROMPT = (
    "Identify each distinct food item visible in this meal photo and estimate how many "
    "servings of each, using simple common food names and household-style serving counts "
    '(e.g. "2" for two eggs, "4" for four idlis, "1" for one bowl of rice). Respond with '
    'JSON only: {"items": [{"food_name": string, "quantity": number}]}. If no food is '
    'visible, respond {"items": []}. Never guess an exact gram weight -- use whole-serving '
    "counts a person would naturally use."
)


def _get_openai_client() -> OpenAI:
    return OpenAI(api_key=get_settings().openai_api_key)


def analyze_meal_photo(client: Client, image_bytes: bytes, content_type: str) -> list[dict]:
    """Estimate food items + quantities from a photo, then resolve each
    against the real food database. Returns a *draft* for the user to
    review/edit -- nothing is written to the database here (see §22: a
    meal is only ever logged once the user confirms).
    """
    b64 = base64.b64encode(image_bytes).decode()
    openai_client = _get_openai_client()

    response = openai_client.chat.completions.create(
        model=_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{content_type};base64,{b64}"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
    )

    if response.usage:
        cost = (
            response.usage.prompt_tokens / 1_000_000 * _PRICE_PER_1M_INPUT_TOKENS
            + response.usage.completion_tokens / 1_000_000 * _PRICE_PER_1M_OUTPUT_TOKENS
        )
        logger.info(
            "photo_analysis model=%s prompt_tokens=%d completion_tokens=%d estimated_cost_usd=%.6f",
            _MODEL,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
            cost,
        )

    try:
        parsed = json.loads(response.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        parsed = {}

    results = []
    for item in parsed.get("items", []):
        food_name = item.get("food_name")
        quantity = item.get("quantity")
        if not food_name or not quantity:
            continue

        resolved = food_service.resolve_food_serving_by_name(client, food_name)
        if resolved is None:
            # Same fallback as text/voice logging: don't leave the user
            # stuck manually searching for something the photo already
            # identified -- estimate it and store it as a normal catalog
            # entry. Only swallow a failure here (leaving it unresolved
            # for the existing manual-search UI) so one bad estimate call
            # doesn't take down the whole photo analysis.
            try:
                food = food_service.estimate_and_create_food(client, food_name)
                serving = food["food_servings"][0]
                resolved = {
                    "food_id": food["id"],
                    "serving_id": serving["id"],
                    "food_name": food["name"],
                    "serving_description": serving["serving_description"],
                }
            except Exception:
                logger.exception("Failed to estimate photo-detected food: %s", food_name)

        results.append({"food_name": food_name, "quantity": quantity, "resolved": resolved})

    return results
