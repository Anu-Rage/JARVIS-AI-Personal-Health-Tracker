# API Reference

The FastAPI backend serves interactive, always-up-to-date API docs itself — that's the source of truth, not a hand-maintained doc here:

- Swagger UI: `<API_URL>/docs`
- ReDoc: `<API_URL>/redoc`
- Raw OpenAPI schema: `<API_URL>/openapi.json`

Locally that's `http://localhost:8000/docs`.

`packages/types` generates shared TypeScript types from `/openapi.json` (see its README) so the frontend never hand-maintains request/response shapes either.

For the endpoint list planned across the MVP and the design rationale behind it, see §19 of [JARVIS_Architecture.md](../architecture/JARVIS_Architecture.md).
