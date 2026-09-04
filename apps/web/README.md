# JARVIS Web (PWA)

Next.js App Router frontend. Mobile-first, installable as a PWA (see [ADR-005](../../docs/decisions/0005-pwa-before-native.md)).

## Setup

```bash
cp .env.local.example .env.local   # fill in Supabase project URL/anon key
npm install                        # from the repo root (npm workspaces)
npm run dev --workspace=apps/web
```

Open [http://localhost:3000](http://localhost:3000). Sign up/sign in at `/login`, then `/dashboard` calls the FastAPI backend's `GET /api/v1/users/me` with the Supabase session token to prove the authenticated round-trip.

## Structure

- `src/app/` — routes (App Router)
- `src/lib/supabase/` — browser client, server client, and the session-refresh proxy helper
- `src/proxy.ts` — Next.js 16 proxy (formerly `middleware.ts`); refreshes the Supabase session and gates `/dashboard`

## Auth

Uses `@supabase/ssr`. The proxy at `src/proxy.ts` refreshes the session cookie on every request; Server Components read it via `src/lib/supabase/server.ts`.
