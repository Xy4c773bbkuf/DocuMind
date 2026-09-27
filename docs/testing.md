# Testing

Backend tests use pytest and FastAPI's TestClient. Run `cd backend; python -m pytest -q`. The suite covers startup/health and extractor validation (valid text, invalid encoding, and corrupt PDF). Release checks should also run `alembic upgrade head` and `npm run build`.
