# ADR-006: Supabase Auth + Supabase Postgres (bundled)

**Decision:** use Supabase for both auth and DB hosting rather than mixing vendors (e.g., Auth.js + Railway Postgres).

**Alternatives:** Auth.js with self-managed user tables.

**Reasons:** one vendor, one dashboard, free tier covers MVP entirely, RLS composes naturally with Postgres policies for future multi-tenant support.

**Trade-offs:** vendor coupling.

**Revisit:** if Supabase pricing/limits become a blocker at scale.
