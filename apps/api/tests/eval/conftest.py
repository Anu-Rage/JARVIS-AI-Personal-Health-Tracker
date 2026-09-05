"""Fixtures for the AI evaluation suite (§29 of the architecture doc).

These tests make real OpenAI API calls against the real Supabase project and
cost real (tiny) amounts of money, so they must never run as part of the
default `pytest` invocation. They're gated behind RUN_AI_EVALS=1.

Real credentials are read directly from the .env file rather than through
app.core.get_settings(), because the top-level tests/conftest.py sets fake
SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env-var *defaults* for the unit test
suite -- and since pydantic-settings prefers actual environment variables
over .env file values, those fakes would otherwise silently shadow the real
credentials whenever both test suites are collected in the same run.
"""

import os
import uuid
from pathlib import Path

import pytest
from dotenv import dotenv_values
from supabase import Client, create_client

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
_ENV = dotenv_values(_ENV_PATH)

RUN_EVALS = os.environ.get("RUN_AI_EVALS") == "1"


def pytest_collection_modifyitems(config, items):
    # A bare module-level `pytestmark` in conftest.py does NOT propagate to
    # sibling test files -- only to tests defined in this file itself. This
    # hook is the actual mechanism that applies to every test collected
    # under this directory, which is what "never run without opting in"
    # requires here.
    if RUN_EVALS:
        return
    skip = pytest.mark.skip(reason="Costs real OpenAI credits; set RUN_AI_EVALS=1 to run this suite.")
    for item in items:
        if "tests/eval/" in str(item.path).replace("\\", "/"):
            item.add_marker(skip)


@pytest.fixture
def openai_api_key() -> str:
    key = _ENV.get("OPENAI_API_KEY")
    if not key:
        pytest.skip("OPENAI_API_KEY not set in .env")
    return key


@pytest.fixture
def eval_user(openai_api_key: str):
    admin_client: Client = create_client(_ENV["SUPABASE_URL"], _ENV["SUPABASE_SERVICE_ROLE_KEY"])
    email = f"eval-{uuid.uuid4().hex[:12]}@jarvis.local"
    result = admin_client.auth.admin.create_user(
        {"email": email, "password": "EvalPass123!", "email_confirm": True}
    )
    user_id = result.user.id

    yield admin_client, user_id

    admin_client.table("meals").delete().eq("user_id", user_id).execute()
    admin_client.table("workout_sessions").delete().eq("user_id", user_id).execute()
    admin_client.table("user_memory").delete().eq("user_id", user_id).execute()
    admin_client.auth.admin.delete_user(user_id)
