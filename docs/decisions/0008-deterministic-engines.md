# ADR-008: Deterministic Nutrition & Workout Engines

**Decision:** all arithmetic (calories, macros, volume, aggregates) in backend code, never in the LLM.

**Reasons:** correctness, auditability, trust — the entire premise of the product.

**Trade-offs:** more backend code to write up front.

**Revisit:** never, this is a core product principle.
