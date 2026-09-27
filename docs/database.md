# Database design

SQLAlchemy models map users, documents, keywords, tags, and the `document_tags` association table. A user owns documents and tags; all document and tag reads/writes are scoped to the authenticated user. Documents store source metadata, extracted text, a bounded summary, word count, estimated reading minutes, status, and file type. Keywords are derived rows with frequency scores.

Alembic migrations are in `backend/alembic/versions`. New environments can use `alembic upgrade head`; the development lifespan also creates tables to keep the MVP easy to run. SQLite is the default, while PostgreSQL can be supplied through `DATABASE_URL`.

For production, add indexes for full-text search, enforce a composite unique constraint on `(owner_id, name)` for tags, and move source blobs to object storage while retaining metadata in SQL.
