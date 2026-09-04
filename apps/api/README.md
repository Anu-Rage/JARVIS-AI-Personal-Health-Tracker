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

## Structure

- `app/main.py` — app factory, CORS, router mounting, `/health`
- `app/core/security.py` — validates the Supabase Auth JWT and extracts the user id; every endpoint depends on this instead of trusting a client-supplied user id (see architecture doc §26-27)
- `app/core/config.py` — env-driven settings
- `app/db/supabase.py` — server-side Supabase client (service-role key, bypasses RLS by design)
- `app/api/v1/` — versioned routers and endpoints
- `app/schemas/` — Pydantic response/request models

## Auth model

The Supabase Auth JWT is validated locally on every request against the project's public JWKS endpoint (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, ES256) — no round-trip to Supabase per call, and no shared secret to manage. The resulting user id is the only user id any endpoint is allowed to act on.
