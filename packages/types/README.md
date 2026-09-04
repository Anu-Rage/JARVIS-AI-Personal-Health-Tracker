# @jarvis/types

TypeScript types generated from the FastAPI backend's OpenAPI schema, shared between `apps/web` and (later) any other TS consumer — one typed contract instead of hand-duplicated interfaces on both sides.

## Generating

With the API running locally (`uvicorn app.main:app --reload` from `apps/api`):

```bash
npm run generate --workspace=packages/types
```

This writes `src/api.d.ts`. Re-run it whenever backend request/response shapes change.
