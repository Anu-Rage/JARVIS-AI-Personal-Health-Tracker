# ADR-007: `gpt-4.1-mini` Only, No Multi-Model Routing at MVP

**Decision:** single cheap model for all AI calls.

**Alternatives:** route reasoning calls to a stronger model.

**Reasons:** budget constraint, unknown usage pattern until real data exists.

**Trade-offs:** possibly lower-quality reasoning on complex questions.

**Revisit:** once token-usage logging (see architecture doc §28) shows where quality actually suffers.
