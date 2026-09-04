# ADR-001: Modular Monolith over Microservices

**Context:** solo developer, single-user MVP.

**Decision:** one FastAPI service with clear internal module boundaries.

**Alternatives:** microservices.

**Reasons:** zero deployment/ops overhead, no network-call complexity between services.

**Trade-offs:** less independent scalability, acceptable at this scale.

**Revisit:** if the system grows to multiple independently-scaling teams/services, which is not a near-term prospect.
