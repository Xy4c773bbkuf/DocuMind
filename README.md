# Insightly — Document Insight Dashboard

A production-minded MVP for turning uploaded documents into searchable, useful insight. It extracts text from TXT/Markdown, PDF, and DOCX files, generates deterministic summaries and keyword themes, and provides a responsive React workspace. Optional AI is explicitly disabled by default (`AI_ENABLED=false`) so the core product is private, predictable, and runnable without external keys.

## Run locally

### Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173, create an account, and upload a document.

Uploaded originals are stored locally under `backend/storage/<user-id>` for the MVP. To enable optional Gemini summaries and document Q&A, copy `backend/.env.example` to `backend/.env`, set `AI_ENABLED=true`, and provide `GEMINI_API_KEY`. Without those settings, deterministic summaries and keyword extraction remain fully functional.

### Docker (PostgreSQL + API + frontend)
Copy `backend\.env.example` to `backend\.env` first. Keep the Gemini key only in that ignored local file.

```powershell
docker compose up --build
```

The Compose stack provisions PostgreSQL with pgvector support, starts the API, and serves the compiled frontend through Nginx at http://localhost:5173. Nginx proxies `/api` to the backend and handles SPA routes. Uploaded originals persist in the `document_storage` Docker volume. For a local SQLite-only workflow, run the API and Vite commands directly.

## Credentials and files

User emails are stored in the database. Passwords are never stored directly: each password is salted and hashed with PBKDF2-SHA256, and only the resulting hash is saved. Login hashes the submitted password and compares it with the stored value. JWTs contain the user id and expiration time; the browser stores the current token in local storage for this local MVP.

Original uploaded files are stored separately from metadata under a user-scoped storage key. In direct local mode they live under `backend/storage/<user-id>`; in Compose they live in the persistent `document_storage` volume. The database stores only the storage key and extracted text/metadata.

## Architecture

`backend/app` is split into configuration, database/models, security, extractors, keyword processing, schemas, and API routers. SQLAlchemy models are compatible with Alembic; run `alembic upgrade head` from `backend` for a migration-managed database. The development lifespan also creates tables automatically for a zero-friction MVP.

The frontend is a Vite + React + TypeScript single-page app with shell navigation, dashboard metrics, document library search, upload flow, and document insight detail views. Token authentication uses JWT bearer tokens. Search is scoped to the authenticated user's documents, with pagination parameters available on the API (`page`, `page_size`).

## Configuration

See `backend/.env.example`. Never commit real JWT secrets or provider credentials. AI integrations are intentionally not called when disabled; the deterministic extractor remains the fallback.

## Tests

```powershell
cd backend
pytest
```

Migration-managed PostgreSQL setup:

```powershell
cd backend
alembic upgrade head
```
