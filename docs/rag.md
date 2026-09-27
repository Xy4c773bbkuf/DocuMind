# RAG and AI boundary

AI is disabled by default. The `/ask` endpoint returns an explanatory response rather than calling a provider or requiring a key, keeping local development deterministic and avoiding accidental data egress.

When enabled, the intended flow is tenant-scoped chunking, embeddings, top-k retrieval, and provider generation using only authorized chunks. Store provider/model metadata, redact logs, and delete embeddings when a document is deleted. Deterministic summaries and keywords remain the fallback.
