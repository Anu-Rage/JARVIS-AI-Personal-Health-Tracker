# ADR-009: Read/Write Tool Separation with Confirmation on Destructive Writes

**Decision:** MVP tools split into read and a small set of validated writes; deletions require explicit user confirmation before execution.

**Reasons:** AI security boundary — the model selects intent, the backend enforces authorization and consequence.

**Trade-offs:** slightly more conversational friction on destructive actions, acceptable given the stakes.
