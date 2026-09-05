import json
import logging

from openai import OpenAI
from supabase import Client

from app.core.config import get_settings
from app.services import analytics_service

logger = logging.getLogger("jarvis.agent")

_MODEL = "gpt-4.1-mini"
_PRICE_PER_1M_INPUT_TOKENS = 0.15
_PRICE_PER_1M_OUTPUT_TOKENS = 0.60

_SYSTEM_PROMPT = (
    "You write short weekly health summaries from data you're given directly -- never "
    "calculate or invent a number that isn't in the data. Use correlational language, "
    "never causal (e.g. 'workouts appear more frequent on days with more sleep', never "
    "'sleep caused more workouts' -- and only if the data actually shows such a pattern; "
    "don't invent one). You are not a medical provider -- no diagnoses, general wellness "
    "framing only. If little or no data was logged this period, say so plainly instead of "
    "padding with generic advice. Keep it to 2-4 sentences."
)


def _get_openai_client() -> OpenAI:
    return OpenAI(api_key=get_settings().openai_api_key)


def generate_weekly_report(client: Client, user_id: str) -> dict:
    summary = analytics_service.get_weekly_summary(client, user_id)

    openai_client = _get_openai_client()
    response = openai_client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(summary)},
        ],
    )

    if response.usage:
        cost = (
            response.usage.prompt_tokens / 1_000_000 * _PRICE_PER_1M_INPUT_TOKENS
            + response.usage.completion_tokens / 1_000_000 * _PRICE_PER_1M_OUTPUT_TOKENS
        )
        logger.info(
            "weekly_report user_id=%s model=%s prompt_tokens=%d completion_tokens=%d estimated_cost_usd=%.6f",
            user_id,
            _MODEL,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
            cost,
        )

    narrative = response.choices[0].message.content or "Not enough data to summarize this week."
    return {"summary": summary, "narrative": narrative}
