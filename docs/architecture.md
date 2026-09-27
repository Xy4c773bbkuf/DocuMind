# Architecture

Insightly is a modular monolith: a FastAPI HTTP application and a Vite SPA backed by one relational database. The backend is intentionally layered into configuration, persistence (`db.py`, SQLAlchemy models), security, extraction/analysis services, schemas, and routers. Routers authenticate first, scope every query by `owner_id`, call services, and return Pydantic DTOs.

The upload pipeline is: validate extension/size/content → select the extractor strategy → normalize text → summary and keyword generation → persist the document and derived data. Extractors are deterministic and local. AI is an explicit optional boundary, never required for the core path.

The frontend uses a shell layout with route-level screens for login, dashboard, library, and detail. It calls the REST API through a small authenticated service helper. Docker Compose runs API and web independently.
