# JARVIS

Personal health & fitness AI agent. Structured data in Postgres is the source of truth; the AI parses, selects tools, and narrates — it never calculates or invents. Full design rationale: [docs/architecture/JARVIS_Architecture.md](docs/architecture/JARVIS_Architecture.md), decision log: [docs/decisions/](docs/decisions/).

## Stack

- **Web:** Next.js 16 (App Router) PWA — [apps/web](apps/web)
- **API:** FastAPI — [apps/api](apps/api)
- **DB + Auth:** Supabase (Postgres + Auth) — schema in [supabase/migrations](supabase/migrations)
- **Shared types:** generated from the API's OpenAPI schema — [packages/types](packages/types)

## Local setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then apply the schema:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

(Or paste `supabase/migrations/0001_init.sql` into the SQL editor.) Grab the project URL, anon key, and service-role key from Project Settings → API. (No JWT secret needed — the backend verifies session tokens against the project's public JWKS endpoint.)

### 2. Backend

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env          # fill in the Supabase values above
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
npm install                   # from repo root — npm workspaces
cp apps/web/.env.local.example apps/web/.env.local   # fill in Supabase URL + anon key
npm run dev --workspace=apps/web
```

Visit `http://localhost:3000`, sign up, and you should land on `/dashboard`, which calls the FastAPI backend's `GET /api/v1/users/me` with your session token — that round-trip proves auth is wired end-to-end.

## Testing

```bash
# backend
cd apps/api && pytest

# frontend
npm run build --workspace=apps/web
```

## Deployment

- **Web:** Vercel, root directory set to `apps/web`, env vars from `.env.local.example`
- **API:** Render, using [render.yaml](render.yaml) as a Blueprint, env vars from `.env.example`
- **DB/Auth:** Supabase (already provisioned above)

All free-tier; see architecture doc §33-34 for cost strategy.

## Repository structure

```
apps/
  web/            # Next.js PWA
  api/            # FastAPI backend
packages/
  types/          # shared TS types generated from the OpenAPI schema
docs/
  architecture/   # this project's design doc
  api/, database/, decisions/
supabase/
  migrations/     # SQL schema, source of truth for the DB
```
