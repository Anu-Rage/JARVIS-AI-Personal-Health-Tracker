# ADR-010: Relational Memory, No Vector Database

**Decision:** `user_memory` as typed relational rows.

**Alternatives:** vector store for semantic recall.

**Reasons:** small, structured fact set at single-user scale doesn't need semantic search; relational is simpler, cheaper, auditable.

**Trade-offs:** won't scale to unstructured free-text memory at volume.

**Revisit:** if/when memory grows into large unstructured notes needing semantic retrieval.
