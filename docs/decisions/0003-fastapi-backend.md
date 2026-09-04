# ADR-003: FastAPI for Backend

**Decision:** Python/FastAPI.

**Alternatives:** Node/Express, Django.

**Reasons:** excellent typed request validation (Pydantic), natural fit for AI/tool-calling code (Python OpenAI SDK is first-class), async support.

**Trade-offs:** two languages in the stack (TS + Python) vs. a full-TS stack.

**Revisit:** if AI orchestration moves client-side, which isn't planned.
