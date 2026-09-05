# JARVIS API

FastAPI backend. Modular monolith (see [ADR-001](../../docs/decisions/0001-modular-monolith.md)); every write goes through the same application services whether it's called from the REST API or an AI tool call.

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate       # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env         # fill in Supabase URL and service-role key
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `/docs`.

## Testing

```bash
pytest
```

Runs unit tests only. The AI evaluation suite (`tests/eval/`) is excluded by
default since it makes real OpenAI calls against the real Supabase project —
run it explicitly when touching the agent/tool layer:

```bash
RUN_AI_EVALS=1 pytest tests/eval -v
```

It checks the behaviors the architecture doc calls out in §29: the model
selects the right tool instead of guessing, an unresolvable food is never
silently logged with invented nutrition, and a delete request is declined
rather than executed (no delete tool exists in the MVP set). Each test
creates and tears down its own throwaway user. Costs a fraction of a cent
per run.

## Structure

- `app/main.py` — app factory, CORS, router mounting, `/health`
- `app/core/security.py` — validates the Supabase Auth JWT and extracts the user id; every endpoint depends on this instead of trusting a client-supplied user id (see architecture doc §26-27)
- `app/core/config.py` — env-driven settings
- `app/db/supabase.py` — server-side Supabase client (service-role key, bypasses RLS by design)
- `app/api/v1/` — versioned routers and endpoints
- `app/schemas/` — Pydantic response/request models
- `app/agent/` — the AI tool layer (`tools.py`) and chat orchestration loop (`orchestrator.py`); tools call the same application services the REST API uses, never a separate write path

## Auth model

The Supabase Auth JWT is validated locally on every request against the project's public JWKS endpoint (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, ES256) — no round-trip to Supabase per call, and no shared secret to manage. The resulting user id is the only user id any endpoint is allowed to act on.
