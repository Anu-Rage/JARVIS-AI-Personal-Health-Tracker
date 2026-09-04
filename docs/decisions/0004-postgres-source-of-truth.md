# ADR-004: PostgreSQL as Source of Truth

**Decision:** single Postgres DB (Supabase-hosted) for all structured data.

**Alternatives:** polyglot persistence, NoSQL.

**Reasons:** relational integrity matters for health data; one DB is simplest to operate solo.

**Trade-offs:** none material at this scale.

**Revisit:** only at genuine multi-tenant scale.
